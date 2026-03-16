const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const dotenv = require("dotenv");
const { customAlphabet } = require("nanoid");

dotenv.config();

const app = express();
const server = http.createServer(app);

const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowAllOrigins = allowedOrigins.length === 0 || allowedOrigins.includes("*");

const isOriginAllowed = (origin) => {
  if (!origin) return true;
  if (allowAllOrigins) return true;
  return allowedOrigins.includes(origin);
};

const corsOriginHandler = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error("Origin not allowed by CORS"));
};

const io = new Server(server, {
  cors: {
    origin: corsOriginHandler,
    methods: ["GET", "POST"],
  },
  pingInterval: 10000,
  pingTimeout: 45000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 120000,
    skipMiddlewares: true,
  },
});

const PORT = process.env.PORT || 4000;
const generateRoomId = customAlphabet("ABCDEFGHJKLMNPQRSTUVWXYZ23456789", 6);
const generateMemberId = customAlphabet(
  "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789",
  12
);
const DISCONNECT_GRACE_MS = Number(process.env.DISCONNECT_GRACE_MS || 45000);

const rooms = new Map();
const socketPresence = new Map();

const createUniqueRoomId = () => {
  let roomId = generateRoomId();
  while (rooms.has(roomId)) {
    roomId = generateRoomId();
  }
  return roomId;
};

const createRoomState = (host) => ({
  roomId: createUniqueRoomId(),
  members: new Map([
    [
      host.memberId,
      {
        ...host,
        isOnline: true,
        lastSeenAt: Date.now(),
      },
    ],
  ]),
  socketToMember: new Map([[host.socketId, host.memberId]]),
  pendingRemovals: new Map(),
  media: {
    type: "youtube",
    url: "",
    videoId: "",
  },
  playback: {
    isPlaying: false,
    currentTime: 0,
    playbackRate: 1,
    lastUpdatedAt: Date.now(),
    updatedBy: host.memberId,
  },
  messages: [],
  createdAt: Date.now(),
});

const getEffectivePlayback = (playback) => {
  if (!playback.isPlaying) return playback;
  const elapsedSeconds = Math.max(0, (Date.now() - playback.lastUpdatedAt) / 1000);
  return {
    ...playback,
    currentTime: playback.currentTime + elapsedSeconds * playback.playbackRate,
  };
};

const serializeRoom = (room) => ({
  roomId: room.roomId,
  members: Array.from(room.members.values()).map((member) => ({
    memberId: member.memberId,
    socketId: member.socketId,
    name: member.name,
    isOnline: !!member.isOnline,
  })),
  media: room.media,
  playback: getEffectivePlayback(room.playback),
  messages: room.messages,
});

const clampTime = (value) => {
  if (typeof value !== "number" || Number.isNaN(value)) return 0;
  return Math.max(0, value);
};

const normalizeName = (name, fallback = "Guest") => {
  if (!name || typeof name !== "string") return fallback;
  const safeName = name.trim();
  if (!safeName) return fallback;
  return safeName.slice(0, 24);
};

const ALLOWED_STICKERS = new Set(["panda", "penguin"]);

const normalizeMemberId = (memberId) => {
  if (typeof memberId !== "string") return "";
  const safe = memberId.trim();
  if (!safe) return "";
  return safe.slice(0, 32);
};

const clearPendingRemoval = (room, memberId) => {
  const timer = room.pendingRemovals.get(memberId);
  if (timer) {
    clearTimeout(timer);
    room.pendingRemovals.delete(memberId);
  }
};

const deleteRoom = (roomId) => {
  const room = rooms.get(roomId);
  if (!room) return;

  for (const timer of room.pendingRemovals.values()) {
    clearTimeout(timer);
  }
  room.pendingRemovals.clear();

  for (const member of room.members.values()) {
    if (member.socketId) {
      socketPresence.delete(member.socketId);
      room.socketToMember.delete(member.socketId);
    }
  }

  rooms.delete(roomId);
};

const removeMember = (room, memberId) => {
  const member = room.members.get(memberId);
  if (!member) return;

  clearPendingRemoval(room, memberId);
  if (member.socketId) {
    socketPresence.delete(member.socketId);
    room.socketToMember.delete(member.socketId);
  }

  room.members.delete(memberId);
  if (room.members.size === 0) {
    deleteRoom(room.roomId);
    return;
  }

  io.to(room.roomId).emit("room:state", serializeRoom(room));
};

const scheduleRemoval = (room, memberId) => {
  clearPendingRemoval(room, memberId);

  const timer = setTimeout(() => {
    const activeRoom = rooms.get(room.roomId);
    if (!activeRoom) return;
    const member = activeRoom.members.get(memberId);
    if (!member || member.isOnline) return;
    removeMember(activeRoom, memberId);
  }, DISCONNECT_GRACE_MS);

  room.pendingRemovals.set(memberId, timer);
};

const attachMemberToSocket = (room, member, socket) => {
  clearPendingRemoval(room, member.memberId);

  if (member.socketId && member.socketId !== socket.id) {
    socketPresence.delete(member.socketId);
    room.socketToMember.delete(member.socketId);
  }

  member.socketId = socket.id;
  member.isOnline = true;
  member.lastSeenAt = Date.now();

  room.socketToMember.set(socket.id, member.memberId);
  socketPresence.set(socket.id, { roomId: room.roomId, memberId: member.memberId });
  socket.join(room.roomId);
};

const getContext = (socket, roomId) => {
  const presence = socketPresence.get(socket.id);
  if (!presence || (roomId && presence.roomId !== roomId)) return null;
  const room = rooms.get(presence.roomId);
  if (!room) return null;
  const member = room.members.get(presence.memberId);
  if (!member || !member.isOnline) return null;
  return { room, member };
};

app.use(
  cors({
    origin: corsOriginHandler,
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  const activeMembers = Array.from(rooms.values()).reduce(
    (sum, room) => sum + Array.from(room.members.values()).filter((member) => member.isOnline).length,
    0
  );
  res.status(200).json({ ok: true, rooms: rooms.size, activeMembers });
});

io.on("connection", (socket) => {
  socket.on("room:create", (payload, callback) => {
    const memberId = normalizeMemberId(payload?.memberId) || generateMemberId();
    const user = {
      memberId,
      socketId: socket.id,
      name: normalizeName(payload?.name),
    };

    const room = createRoomState(user);
    rooms.set(room.roomId, room);
    socketPresence.set(socket.id, { roomId: room.roomId, memberId });
    socket.join(room.roomId);

    callback?.({
      ok: true,
      room: serializeRoom(room),
      socketId: socket.id,
      memberId,
    });
  });

  socket.on("room:join", (payload, callback) => {
    const requestedRoomId = payload?.roomId?.toUpperCase()?.trim();
    const room = rooms.get(requestedRoomId);

    if (!room) {
      callback?.({ ok: false, error: "Room not found. Check room code and retry." });
      return;
    }

    const requestedMemberId = normalizeMemberId(payload?.memberId);
    let member = requestedMemberId ? room.members.get(requestedMemberId) : null;

    if (member) {
      member.name = normalizeName(payload?.name, member.name);
    } else {
      member = {
        memberId: requestedMemberId || generateMemberId(),
        socketId: null,
        name: normalizeName(payload?.name),
        isOnline: false,
        lastSeenAt: Date.now(),
      };
      room.members.set(member.memberId, member);
    }

    attachMemberToSocket(room, member, socket);

    const serializedRoom = serializeRoom(room);
    callback?.({
      ok: true,
      room: serializedRoom,
      socketId: socket.id,
      memberId: member.memberId,
    });
    io.to(room.roomId).emit("room:state", serializedRoom);
  });

  socket.on("room:reconnect", (payload, callback) => {
    const roomId = payload?.roomId?.toUpperCase()?.trim();
    const memberId = normalizeMemberId(payload?.memberId);
    const room = rooms.get(roomId);

    if (!room || !memberId) {
      callback?.({ ok: false, error: "Unable to restore room session." });
      return;
    }

    const member = room.members.get(memberId);
    if (!member) {
      callback?.({ ok: false, error: "Member session expired from room." });
      return;
    }

    member.name = normalizeName(payload?.name, member.name);
    attachMemberToSocket(room, member, socket);

    const serializedRoom = serializeRoom(room);
    callback?.({
      ok: true,
      room: serializedRoom,
      socketId: socket.id,
      memberId: member.memberId,
    });
    io.to(room.roomId).emit("room:state", serializedRoom);
  });

  socket.on("room:leave", (payload) => {
    const context = getContext(socket, payload?.roomId);
    if (!context) return;

    socket.leave(context.room.roomId);
    removeMember(context.room, context.member.memberId);
  });

  socket.on("media:set", (payload, callback) => {
    const context = getContext(socket, payload?.roomId);
    if (!context) {
      callback?.({ ok: false, error: "Room does not exist anymore." });
      return;
    }
    const { room, member } = context;

    const media = payload?.media || {};
    room.media = {
      type: media.type === "netflix" ? "netflix" : "youtube",
      url: media.url || "",
      videoId: media.videoId || "",
    };
    room.playback = {
      isPlaying: false,
      currentTime: 0,
      playbackRate: 1,
      lastUpdatedAt: Date.now(),
      updatedBy: member.memberId,
    };

    const serializedRoom = serializeRoom(room);
    io.to(room.roomId).emit("room:state", serializedRoom);
    callback?.({ ok: true, room: serializedRoom });
  });

  socket.on("playback:update", (payload) => {
    const context = getContext(socket, payload?.roomId);
    if (!context) return;
    const { room, member } = context;

    const incoming = payload?.playback || {};
    const currentPlayback = getEffectivePlayback(room.playback);

    room.playback = {
      isPlaying:
        typeof incoming.isPlaying === "boolean"
          ? incoming.isPlaying
          : currentPlayback.isPlaying,
      currentTime:
        incoming.currentTime !== undefined
          ? clampTime(incoming.currentTime)
          : clampTime(currentPlayback.currentTime),
      playbackRate:
        typeof incoming.playbackRate === "number" ? incoming.playbackRate : 1,
      lastUpdatedAt: Date.now(),
      updatedBy: member.memberId,
    };

    socket.to(room.roomId).emit("playback:updated", {
      roomId: room.roomId,
      playback: serializeRoom(room).playback,
    });
  });

  socket.on("chat:send", (payload, callback) => {
    const context = getContext(socket, payload?.roomId);
    if (!context) {
      callback?.({ ok: false, error: "Room unavailable." });
      return;
    }
    const { room, member } = context;

    const messageText = payload?.message?.trim() || "";
    const sticker = ALLOWED_STICKERS.has(payload?.sticker) ? payload.sticker : "";

    if (!messageText && !sticker) {
      callback?.({ ok: false, error: "Message cannot be empty." });
      return;
    }

    const message = {
      id: `${Date.now()}-${Math.round(Math.random() * 1e6)}`,
      sender: member?.name || "Guest",
      text: messageText.slice(0, 500),
      sticker: sticker || null,
      type: sticker ? "sticker" : "text",
      createdAt: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 150) {
      room.messages = room.messages.slice(-150);
    }

    io.to(room.roomId).emit("chat:new", message);
    callback?.({ ok: true });
  });

  socket.on("disconnect", () => {
    const presence = socketPresence.get(socket.id);
    if (!presence) return;

    socketPresence.delete(socket.id);
    const room = rooms.get(presence.roomId);
    if (!room) return;

    room.socketToMember.delete(socket.id);
    const member = room.members.get(presence.memberId);
    if (!member || member.socketId !== socket.id) return;

    member.socketId = null;
    member.isOnline = false;
    member.lastSeenAt = Date.now();
    scheduleRemoval(room, member.memberId);
    io.to(room.roomId).emit("room:state", serializeRoom(room));
  });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Teleparty server running on port ${PORT}`);
});
