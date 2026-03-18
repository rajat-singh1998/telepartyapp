import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import YouTube from "react-youtube";
import { extractYouTubeId } from "./utils/youtube";
import pandaSticker from "./assets/stickers/panda.svg";
import penguinSticker from "./assets/stickers/penguin.svg";
import cuddleMascot from "./assets/stickers/panda-penguin-cuddle.svg";
import pandaLoveSticker from "./assets/stickers/panda-love.svg";
import pandaBlushSticker from "./assets/stickers/panda-blush.svg";
import pandaSleepySticker from "./assets/stickers/panda-sleepy.svg";
import penguinLoveSticker from "./assets/stickers/penguin-love.svg";
import penguinBlushSticker from "./assets/stickers/penguin-blush.svg";
import cuddleHeartSticker from "./assets/stickers/cuddle-heart.svg";
import bellVoiceUrl from "./assets/sounds/baby-bell-voice.mp3";

const SOCKET_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
const TENOR_API_KEY = import.meta.env.VITE_TENOR_API_KEY || "";
const TENOR_CLIENT_KEY = "teleparty-love";
const SESSION_STORAGE_KEY = "teleparty_session_v1";
const LOVE_NAME = "Nunu";
const STICKERS = [
  { key: "panda", label: "Panda", src: pandaSticker },
  { key: "penguin", label: "Penguin", src: penguinSticker },
  { key: "panda-love", label: "Panda Love", src: pandaLoveSticker },
  { key: "panda-blush", label: "Blush Panda", src: pandaBlushSticker },
  { key: "panda-sleepy", label: "Sleepy Panda", src: pandaSleepySticker },
  { key: "penguin-love", label: "Penguin Love", src: penguinLoveSticker },
  { key: "penguin-blush", label: "Blush Penguin", src: penguinBlushSticker },
  { key: "cuddle-heart", label: "Cuddle", src: cuddleHeartSticker },
];
const STICKER_MAP = Object.fromEntries(STICKERS.map((sticker) => [sticker.key, sticker]));
const BELL_ICON = "\uD83D\uDD14";
const HEART_ICON = "\u2665";
const KISS_ICON = "\uD83D\uDC8B";
const LOVE_PARTICLES = [
  {
    id: "heart-1",
    kind: "heart",
    left: "6%",
    size: "1rem",
    duration: "17s",
    delay: "-2s",
    swayMid: "-24px",
    swayEnd: "12px",
    opacity: 0.34,
    color: "rgba(255, 199, 229, 0.62)",
  },
  {
    id: "heart-2",
    kind: "heart",
    left: "16%",
    size: "1.45rem",
    duration: "15s",
    delay: "-5s",
    swayMid: "20px",
    swayEnd: "-10px",
    opacity: 0.44,
    color: "rgba(255, 178, 220, 0.7)",
  },
  {
    id: "tag-1",
    kind: "tag",
    label: "Hunu \u2764 Nunu",
    left: "4%",
    size: "0.84rem",
    duration: "23s",
    delay: "-6s",
    swayMid: "42vw",
    swayEnd: "64vw",
    opacity: 0.52,
    color: "rgba(255, 220, 241, 0.9)",
  },
  {
    id: "heart-3",
    kind: "heart",
    left: "38%",
    size: "1.18rem",
    duration: "18s",
    delay: "-3.5s",
    swayMid: "-16px",
    swayEnd: "14px",
    opacity: 0.36,
    color: "rgba(255, 191, 226, 0.62)",
  },
  {
    id: "heart-4",
    kind: "heart",
    left: "49%",
    size: "1.74rem",
    duration: "13s",
    delay: "-6s",
    swayMid: "22px",
    swayEnd: "-16px",
    opacity: 0.5,
    color: "rgba(255, 170, 216, 0.75)",
  },
  {
    id: "tag-2",
    kind: "tag",
    label: "Nunu \u2764 Hunu",
    left: "92%",
    size: "0.82rem",
    duration: "21s",
    delay: "-9s",
    swayMid: "-48vw",
    swayEnd: "-62vw",
    opacity: 0.5,
    color: "rgba(255, 230, 246, 0.9)",
  },
  {
    id: "tag-3",
    kind: "tag",
    label: "Hunu \u2764 Nunu",
    left: "24%",
    size: "0.8rem",
    duration: "25s",
    delay: "-13s",
    swayMid: "-30vw",
    swayEnd: "28vw",
    opacity: 0.44,
    color: "rgba(255, 212, 237, 0.88)",
  },
  {
    id: "tag-4",
    kind: "tag",
    label: "Nunu \u2764 Hunu",
    left: "70%",
    size: "0.86rem",
    duration: "19s",
    delay: "-4s",
    swayMid: "36vw",
    swayEnd: "-22vw",
    opacity: 0.46,
    color: "rgba(255, 226, 245, 0.9)",
  },
  {
    id: "heart-5",
    kind: "heart",
    left: "74%",
    size: "1.1rem",
    duration: "16s",
    delay: "-7s",
    swayMid: "18px",
    swayEnd: "-13px",
    opacity: 0.38,
    color: "rgba(255, 204, 232, 0.66)",
  },
  {
    id: "heart-6",
    kind: "heart",
    left: "84%",
    size: "1.9rem",
    duration: "14s",
    delay: "-9s",
    swayMid: "-20px",
    swayEnd: "11px",
    opacity: 0.48,
    color: "rgba(255, 175, 218, 0.74)",
  },
  {
    id: "heart-7",
    kind: "heart",
    left: "93%",
    size: "0.92rem",
    duration: "19s",
    delay: "-4s",
    swayMid: "15px",
    swayEnd: "-9px",
    opacity: 0.32,
    color: "rgba(255, 218, 240, 0.58)",
  },
];

const socket = io(SOCKET_URL, {
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 800,
  reconnectionDelayMax: 5000,
  timeout: 20000,
  transports: ["polling", "websocket"],
});

const readStoredSession = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.roomId || !parsed?.memberId) return null;
    return {
      roomId: String(parsed.roomId).toUpperCase(),
      memberId: String(parsed.memberId),
      name: typeof parsed.name === "string" ? parsed.name : "",
    };
  } catch (_err) {
    return null;
  }
};

const writeStoredSession = (session) => {
  if (typeof window === "undefined" || !session?.roomId || !session?.memberId) return;
  window.localStorage.setItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({
      roomId: session.roomId,
      memberId: session.memberId,
      name: session.name || "",
    })
  );
};

const clearStoredSession = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

const toComputedPlayback = (playback, syncedAt) => {
  if (!playback) return null;
  if (!playback.isPlaying) return playback;
  const elapsed = Math.max(0, (Date.now() - syncedAt) / 1000);
  return {
    ...playback,
    currentTime: playback.currentTime + elapsed * (playback.playbackRate || 1),
  };
};

const formatClock = (seconds) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const sec = safe % 60;
  if (hours > 0) return `${hours}:${String(minutes).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${minutes}:${String(sec).padStart(2, "0")}`;
};

const normalizeProfileName = (name) => {
  if (!name || typeof name !== "string") return "Guest";
  const safe = name.trim();
  if (!safe) return "Guest";
  return safe.slice(0, 24);
};

const getTenorStickerUrl = (mediaFormats = {}) => {
  const candidates = [
    "transparentwebp",
    "webp_transparent",
    "tinywebp",
    "webp",
    "gif",
    "tinygif",
    "nanowebp",
    "nanogif",
  ];

  for (const key of candidates) {
    const value = mediaFormats[key]?.url;
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
};

const mapTenorSticker = (item) => {
  if (!item?.id || !item?.media_formats) return null;
  const url = getTenorStickerUrl(item.media_formats);
  if (!url) return null;

  return {
    id: String(item.id),
    provider: "tenor",
    label: String(item.content_description || item.title || "Sticker").slice(0, 40),
    url,
    previewUrl:
      item.media_formats.tinywebp?.url ||
      item.media_formats.nanowebp?.url ||
      item.media_formats.tinygif?.url ||
      url,
  };
};

const getHealthUrl = (baseUrl) => {
  try {
    return new URL("/health", baseUrl).toString();
  } catch (_err) {
    return `${String(baseUrl || "").replace(/\/$/, "")}/health`;
  }
};

const getSpecialLoveMessage = (name) => {
  const normalized = String(name || "").trim().toLowerCase();
  if (normalized === "nunu") {
    return "I love you Nunu \u2665";
  }
  if (normalized === "pussy") {
    return "I love you Pussy \u2665 And I will make you wet";
  }
  return "";
};

const createRainParticles = (icon, count = 420, className = "") =>
  Array.from({ length: count }, (_, index) => ({
    id: `${Date.now()}-${index}-${Math.round(Math.random() * 1e6)}`,
    icon,
    className,
    left: `${Math.random() * 100}%`,
    delay: `${Math.random() * 0.55}s`,
    duration: `${5.8 + Math.random() * 0.8}s`,
    size: `${0.42 + Math.random() * 0.46}rem`,
    drift: `${-64 + Math.random() * 128}px`,
    opacity: (0.62 + Math.random() * 0.34).toFixed(2),
    rotate: `${-26 + Math.random() * 52}deg`,
  }));

function App() {
  const storedSession = readStoredSession();
  const [isConnected, setIsConnected] = useState(false);
  const [connectionLabel, setConnectionLabel] = useState("Connecting...");
  const [profileName, setProfileName] = useState(() => storedSession?.name || "");
  const [roomInput, setRoomInput] = useState(() => storedSession?.roomId || "");
  const [chatInput, setChatInput] = useState("");
  const [mediaType, setMediaType] = useState("youtube");
  const [mediaUrl, setMediaUrl] = useState("");
  const [isMediaPanelOpen, setIsMediaPanelOpen] = useState(() =>
    typeof window === "undefined" ? true : !window.matchMedia("(max-width: 760px)").matches
  );
  const [isFullView, setIsFullView] = useState(false);
  const [isStickerPickerOpen, setIsStickerPickerOpen] = useState(false);
  const [isChatComposerFocused, setIsChatComposerFocused] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [tick, setTick] = useState(0);
  const [session, setSession] = useState(null);
  const [specialPopupMessage, setSpecialPopupMessage] = useState("");

  const playerRef = useRef(null);
  const chatMessagesRef = useRef(null);
  const suppressLocalSync = useRef(false);
  const sessionRef = useRef(null);
  const profileNameRef = useRef(profileName);
  const restoringRef = useRef(false);
  const audioContextRef = useRef(null);
  const bellVoiceAudioRef = useRef(null);
  const speechVoicesRef = useRef([]);
  const soundReadyRef = useRef(false);
  const wakingServerRef = useRef(false);
  const lastWakeAttemptRef = useRef(0);
  const [bellCooldownUntil, setBellCooldownUntil] = useState(0);
  const [isSoundReady, setIsSoundReady] = useState(false);
  const [heartRainBursts, setHeartRainBursts] = useState([]);
  const [kissRainBursts, setKissRainBursts] = useState([]);
  const [stickerQuery, setStickerQuery] = useState("");
  const [remoteStickers, setRemoteStickers] = useState([]);
  const [isRemoteStickersLoading, setIsRemoteStickersLoading] = useState(false);
  const [remoteStickerError, setRemoteStickerError] = useState("");
  const heartRainTimersRef = useRef([]);
  const specialPopupTimerRef = useRef(null);

  const computedPlayback = useMemo(() => {
    if (!session?.playback || !session?.playbackSyncedAt) return null;
    return toComputedPlayback(session.playback, session.playbackSyncedAt);
  }, [session?.playback, session?.playbackSyncedAt, tick]);

  const wakeServerIfNeeded = async ({ force = false } = {}) => {
    if (typeof window === "undefined") return;
    if (!/^https?:\/\//i.test(SOCKET_URL) || /localhost|127\.0\.0\.1/i.test(SOCKET_URL)) return;
    if (wakingServerRef.current) return;

    const now = Date.now();
    if (!force && now - lastWakeAttemptRef.current < 12000) return;

    wakingServerRef.current = true;
    lastWakeAttemptRef.current = now;
    setConnectionLabel((current) => (current === "Connected" ? current : "Waking server..."));

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 55000);

    try {
      await fetch(getHealthUrl(SOCKET_URL), {
        method: "GET",
        cache: "no-store",
        mode: "cors",
        signal: controller.signal,
      });
    } catch (_err) {
      // Render free instances may still be waking or the request can be aborted after the timeout.
    } finally {
      window.clearTimeout(timeout);
      wakingServerRef.current = false;
    }
  };

  const unlockBellAudio = async () => {
    if (typeof window === "undefined") return false;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;

    try {
      if (AudioContextClass && !audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (audioContextRef.current?.state === "suspended") {
        await audioContextRef.current.resume();
      }

      if (!bellVoiceAudioRef.current) {
        const audio = new Audio(bellVoiceUrl);
        audio.preload = "auto";
        audio.playsInline = true;
        bellVoiceAudioRef.current = audio;
      }

      const bellVoiceAudio = bellVoiceAudioRef.current;
      try {
        bellVoiceAudio.muted = true;
        bellVoiceAudio.volume = 0;
        bellVoiceAudio.currentTime = 0;
        await bellVoiceAudio.play();
        bellVoiceAudio.pause();
        bellVoiceAudio.currentTime = 0;
      } catch (_err) {
        // Some mobile browsers ignore warm-up play until an explicit tap.
      } finally {
        bellVoiceAudio.muted = false;
        bellVoiceAudio.volume = 1;
      }

      if (window.speechSynthesis) {
        speechVoicesRef.current = window.speechSynthesis.getVoices();
        try {
          window.speechSynthesis.resume?.();
        } catch (_err) {
          // Some mobile browsers do not implement resume cleanly.
        }
      }

      setIsSoundReady(true);
      setInfo("Sound enabled on this device.");
      return true;
    } catch (_err) {
      setIsSoundReady(false);
      setInfo("Tap Enable Sound once on this device so bell voice can play here.");
      return false;
    }
  };

  const enableSoundOnDevice = async () => {
    const unlocked = await unlockBellAudio();
    if (!unlocked) return;

    try {
      await playBellTone();
      await playBellVoice();
      setInfo("Sound enabled on this device.");
    } catch (_err) {
      setInfo("Sound unlocked, but preview stayed muted. Try tapping Enable Sound once more.");
      setIsSoundReady(false);
      soundReadyRef.current = false;
    }
  };

  useEffect(() => {
    profileNameRef.current = profileName;
  }, [profileName]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    soundReadyRef.current = isSoundReady;
  }, [isSoundReady]);

  useEffect(
    () => () => {
      if (specialPopupTimerRef.current) {
        window.clearTimeout(specialPopupTimerRef.current);
      }
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const manager = socket.io;

    const beginConnection = async () => {
      await wakeServerIfNeeded({ force: true });
      if (!cancelled && !socket.connected) {
        socket.connect();
      }
    };

    beginConnection();

    const attemptRestore = () => {
      const saved =
        sessionRef.current?.roomId && sessionRef.current?.memberId
          ? {
              roomId: sessionRef.current.roomId,
              memberId: sessionRef.current.memberId,
              name: sessionRef.current.selfName || profileNameRef.current || "",
            }
          : readStoredSession();

      if (!saved?.roomId || !saved?.memberId || restoringRef.current) return;

      restoringRef.current = true;
      socket.timeout(10000).emit(
        "room:reconnect",
        {
          roomId: saved.roomId,
          memberId: saved.memberId,
          name: normalizeProfileName(saved.name),
        },
        (err, response) => {
          restoringRef.current = false;
          if (err || !response?.ok) {
            setError("Could not restore room after reconnect. Please join again.");
            setInfo("");
            clearStoredSession();
            setSession(null);
            return;
          }

          const stableName = normalizeProfileName(saved.name || profileNameRef.current);
          setProfileName(stableName);
          setRoomInput(response.room.roomId);
          writeStoredSession({
            roomId: response.room.roomId,
            memberId: response.memberId,
            name: stableName,
          });
          setSession({
            ...response.room,
            socketId: response.socketId,
            memberId: response.memberId,
            selfName: stableName,
            playbackSyncedAt: Date.now(),
          });
          setInfo("Reconnected to your room.");
          setError("");
        }
      );
    };

    const onConnect = () => {
      setIsConnected(true);
      setConnectionLabel("Connected");
      setError("");
      if (!sessionRef.current?.roomId) {
        setInfo("");
      }
      attemptRestore();
    };

    const onDisconnect = () => {
      setIsConnected(false);
      setConnectionLabel("Reconnecting...");
      if (sessionRef.current?.roomId) {
        setInfo("Connection dropped. Reconnecting automatically...");
      } else {
        setInfo("Waking the server. The first connection can take a little time on Render.");
      }
      void wakeServerIfNeeded();
    };

    const onConnectError = () => {
      setIsConnected(false);
      setConnectionLabel("Reconnecting...");
      if (!sessionRef.current?.roomId) {
        setInfo("Waking the server. The first connection can take a little time on Render.");
      }
      void wakeServerIfNeeded();
    };

    const onReconnectAttempt = () => {
      setConnectionLabel("Reconnecting...");
      void wakeServerIfNeeded();
    };

    const onReconnectFailed = () => {
      setConnectionLabel("Reconnect failed");
      setError("Network unstable. Please check internet and retry.");
    };

    const onRoomState = (room) => {
      setSession((prev) => {
        if (!prev || prev.roomId !== room.roomId) return prev;
        return {
          ...prev,
          ...room,
          playbackSyncedAt: Date.now(),
        };
      });
    };

    const onPlaybackUpdated = (payload) => {
      setSession((prev) => {
        if (!prev || prev.roomId !== payload.roomId) return prev;
        return {
          ...prev,
          playback: payload.playback,
          playbackSyncedAt: Date.now(),
        };
      });
    };

    const onChatNew = (incoming) => {
      setSession((prev) => {
        if (!prev) return prev;
        const exists = prev.messages?.some((message) => message.id === incoming.id);
        if (exists) return prev;
        return { ...prev, messages: [...(prev.messages || []), incoming] };
      });
    };

    const onBellRung = async (payload) => {
      setBellCooldownUntil(payload?.createdAt ? payload.createdAt + 5000 : Date.now() + 5000);

      const isSender = payload?.senderId === sessionRef.current?.memberId;
      if (isSender) {
        setInfo("Bell sent to the room.");
        return;
      }

      if (!soundReadyRef.current) {
        setInfo("Tap Enable Sound once on this device so bell voice can play here.");
      }

      setInfo(`${payload?.senderName || "Someone"} rang the bell.`);

      try {
        await playBellTone();
        await playBellVoice();
      } catch (_err) {
        setInfo(`${payload?.senderName || "Someone"} rang the bell. Tap anywhere if sound stayed muted.`);
      }
    };

    const onHeartBurst = (payload) => {
      const createdAt = payload?.createdAt || Date.now();
      setInfo(`${payload?.senderName || "Someone"} started a heart shower.`);

      const burstId = `${createdAt}-${payload?.senderId || "room"}`;
      setHeartRainBursts((current) => [
        ...current,
        { id: burstId, particles: createRainParticles(HEART_ICON, 420) },
      ]);

      const timer = window.setTimeout(() => {
        setHeartRainBursts((current) => current.filter((burst) => burst.id !== burstId));
        heartRainTimersRef.current = heartRainTimersRef.current.filter((item) => item !== timer);
      }, 5000);

      heartRainTimersRef.current.push(timer);
    };

    const onKissBurst = (payload) => {
      const createdAt = payload?.createdAt || Date.now();
      setInfo(`${payload?.senderName || "Someone"} started a kisses shower.`);

      const burstId = `${createdAt}-${payload?.senderId || "room"}-kiss`;
      setKissRainBursts((current) => [
        ...current,
        { id: burstId, particles: createRainParticles(KISS_ICON, 420, "kiss-rain-drop") },
      ]);

      const timer = window.setTimeout(() => {
        setKissRainBursts((current) => current.filter((burst) => burst.id !== burstId));
        heartRainTimersRef.current = heartRainTimersRef.current.filter((item) => item !== timer);
      }, 5000);

      heartRainTimersRef.current.push(timer);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    manager.on("reconnect_attempt", onReconnectAttempt);
    manager.on("reconnect_failed", onReconnectFailed);
    socket.on("room:state", onRoomState);
    socket.on("playback:updated", onPlaybackUpdated);
    socket.on("chat:new", onChatNew);
    socket.on("bell:rung", onBellRung);
    socket.on("heart:burst", onHeartBurst);
    socket.on("kiss:burst", onKissBurst);

    return () => {
      cancelled = true;
      heartRainTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      heartRainTimersRef.current = [];
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      manager.off("reconnect_attempt", onReconnectAttempt);
      manager.off("reconnect_failed", onReconnectFailed);
      socket.off("room:state", onRoomState);
      socket.off("playback:updated", onPlaybackUpdated);
      socket.off("chat:new", onChatNew);
      socket.off("bell:rung", onBellRung);
      socket.off("heart:burst", onHeartBurst);
      socket.off("kiss:burst", onKissBurst);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    window.addEventListener("pointerdown", unlockBellAudio, { passive: true });
    return () => {
      window.removeEventListener("pointerdown", unlockBellAudio);
      if (bellVoiceAudioRef.current) {
        bellVoiceAudioRef.current.pause();
        bellVoiceAudioRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return undefined;

    const loadVoices = () => {
      speechVoicesRef.current = window.speechSynthesis.getVoices();
    };

    loadVoices();
    window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
    return () => window.speechSynthesis.removeEventListener?.("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const query = window.matchMedia("(max-width: 760px)");
    const onChange = (event) => {
      if (!event.matches) setIsMediaPanelOpen(true);
    };

    if (query.addEventListener) {
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    }

    query.addListener(onChange);
    return () => query.removeListener(onChange);
  }, []);

  useEffect(() => {
    if (!isStickerPickerOpen) return undefined;
    if (!TENOR_API_KEY) {
      setRemoteStickers([]);
      setRemoteStickerError("");
      return undefined;
    }

    const controller = new AbortController();
    const queryText = stickerQuery.trim();
    const endpoint = queryText
      ? "https://tenor.googleapis.com/v2/search"
      : "https://tenor.googleapis.com/v2/featured";
    const searchParams = new URLSearchParams({
      key: TENOR_API_KEY,
      client_key: TENOR_CLIENT_KEY,
      limit: "8",
      searchfilter: "sticker",
      country: "IN",
      locale: "en_IN",
    });

    if (queryText) {
      searchParams.set("q", queryText);
      searchParams.set("random", "true");
    }

    const timeout = window.setTimeout(async () => {
      setIsRemoteStickersLoading(true);
      setRemoteStickerError("");

      try {
        const response = await fetch(`${endpoint}?${searchParams.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("Sticker search failed.");
        }

        const data = await response.json();
        const items = Array.isArray(data?.results) ? data.results.map(mapTenorSticker).filter(Boolean) : [];
        setRemoteStickers(items);
        if (!items.length && queryText) {
          setRemoteStickerError("No cute stickers found for that search.");
        }
      } catch (err) {
        if (err?.name === "AbortError") return;
        setRemoteStickerError("Could not load online stickers right now.");
      } finally {
        setIsRemoteStickersLoading(false);
      }
    }, queryText ? 260 : 0);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [isStickerPickerOpen, stickerQuery]);

  useEffect(() => {
    if (!session?.media) return;
    setMediaType(session.media.type || "youtube");
    setMediaUrl(session.media.url || "");
  }, [session?.media?.type, session?.media?.url]);

  useEffect(() => {
    if (session?.media?.type !== "youtube" || !playerRef.current || !computedPlayback) return;

    const timer = setTimeout(() => {
      const player = playerRef.current;
      if (!player?.getCurrentTime) return;

      const targetTime = computedPlayback.currentTime || 0;
      const current = player.getCurrentTime();
      const drift = Math.abs(current - targetTime);
      const playerState = player.getPlayerState?.();

      if (drift > 1.2) {
        suppressLocalSync.current = true;
        player.seekTo(targetTime, true);
        setTimeout(() => {
          suppressLocalSync.current = false;
        }, 150);
      }

      if (computedPlayback.isPlaying && playerState !== 1) {
        suppressLocalSync.current = true;
        player.playVideo?.();
        setTimeout(() => {
          suppressLocalSync.current = false;
        }, 150);
      }

      if (!computedPlayback.isPlaying && playerState === 1) {
        suppressLocalSync.current = true;
        player.pauseVideo?.();
        setTimeout(() => {
          suppressLocalSync.current = false;
        }, 150);
      }
    }, 0);

    return () => clearTimeout(timer);
  }, [computedPlayback, session?.media?.type]);

  useEffect(() => {
    if (!session?.roomId || !session?.memberId) return;
    writeStoredSession({
      roomId: session.roomId,
      memberId: session.memberId,
      name: session.selfName || normalizeProfileName(profileName),
    });
  }, [profileName, session?.roomId, session?.memberId, session?.selfName]);

  useEffect(() => {
    const container = chatMessagesRef.current;
    if (!container) return;
    container.scrollTop = container.scrollHeight;
  }, [session?.messages?.length]);

  const ensureConnected = () => {
    if (socket.connected) return true;
    setError("Still connecting. Please wait a moment and try again.");
    return false;
  };

  const ensureName = () => normalizeProfileName(profileName);

  const playBellTone = async () => {
    if (typeof window === "undefined") return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContextClass();
    }

    const context = audioContextRef.current;
    if (context.state === "suspended") {
      await context.resume();
    }

    const startAt = context.currentTime + 0.02;
    const notes = [
      { frequency: 784, duration: 0.18, gain: 0.24 },
      { frequency: 1174.66, duration: 0.2, gain: 0.2 },
      { frequency: 1567.98, duration: 0.28, gain: 0.16 },
    ];

    notes.forEach((note, index) => {
      const oscillator = context.createOscillator();
      const gainNode = context.createGain();
      const noteStart = startAt + index * 0.08;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(note.frequency, noteStart);
      oscillator.connect(gainNode);
      gainNode.connect(context.destination);

      gainNode.gain.setValueAtTime(0.0001, noteStart);
      gainNode.gain.exponentialRampToValueAtTime(note.gain, noteStart + 0.03);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, noteStart + note.duration);

      oscillator.start(noteStart);
      oscillator.stop(noteStart + note.duration + 0.03);
    });
  };

  const playFallbackBellVoice = async () => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    let voices = speechVoicesRef.current.length ? speechVoicesRef.current : synth.getVoices();

    if (!voices.length) {
      voices = await new Promise((resolve) => {
        const fallbackTimer = window.setTimeout(() => resolve(synth.getVoices()), 700);
        const handleVoices = () => {
          window.clearTimeout(fallbackTimer);
          synth.removeEventListener?.("voiceschanged", handleVoices);
          resolve(synth.getVoices());
        };
        synth.addEventListener?.("voiceschanged", handleVoices);
      });
    }

    speechVoicesRef.current = voices;
    const preferredVoice =
      voices.find((voice) => /^hi[-_]/i.test(voice.lang)) ||
      voices.find((voice) => /^en[-_](IN|GB|US)/i.test(voice.lang)) ||
      voices[0];
    const useHindiVoice = Boolean(preferredVoice && /^hi[-_]/i.test(preferredVoice.lang));
    const spokenText = useHindiVoice ? "\u0909\u0920\u094B \u0928\u093E" : "Uthooo naaa";

    await new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(spokenText);
      utterance.lang = preferredVoice?.lang || (useHindiVoice ? "hi-IN" : "en-IN");
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      utterance.rate = 0.9;
      utterance.pitch = 1.45;
      utterance.volume = 1;

      const finish = () => resolve();
      utterance.onend = finish;
      utterance.onerror = finish;

      if (synth.speaking || synth.pending) {
        synth.cancel();
      }

      window.setTimeout(() => {
        try {
          synth.speak(utterance);
        } catch (_err) {
          resolve();
        }
      }, 80);

      window.setTimeout(finish, 3200);
    });
  };

  const playBellVoice = async () => {
    if (typeof window === "undefined") return;

    try {
      const audio = new Audio(bellVoiceUrl);
      audio.preload = "auto";
      audio.playsInline = true;
      audio.volume = 1;
      audio.currentTime = 0;
      await audio.play();

      window.setTimeout(() => {
        audio.pause();
        audio.src = "";
      }, 5000);
      return;
    } catch (_err) {
      await playFallbackBellVoice();
    }
  };

  const ringBell = () => {
    if (!session?.roomId || !ensureConnected()) return;
    if (Date.now() < bellCooldownUntil) return;

    socket.timeout(8000).emit("bell:ring", { roomId: session.roomId }, (err, response) => {
      if (err || !response?.ok) {
        setError(response?.error || "Bell could not ring right now.");
        return;
      }
      setBellCooldownUntil((response?.createdAt || Date.now()) + 5000);
      setInfo("Bell sent to the room.");
    });
  };

  const triggerHeartRain = () => {
    if (!session?.roomId || !ensureConnected()) return;

    socket.timeout(8000).emit("heart:burst", { roomId: session.roomId }, (err, response) => {
      if (err || !response?.ok) {
        setError(response?.error || "Heart rain could not start right now.");
        return;
      }
      setInfo("Heart rain sent to the room.");
    });
  };

  const triggerKissRain = () => {
    if (!session?.roomId || !ensureConnected()) return;

    socket.timeout(8000).emit("kiss:burst", { roomId: session.roomId }, (err, response) => {
      if (err || !response?.ok) {
        setError(response?.error || "Kisses rain could not start right now.");
        return;
      }
      setInfo("Kisses rain sent to the room.");
    });
  };

  const showSpecialLovePopup = (name) => {
    const message = getSpecialLoveMessage(name);
    if (!message) return;

    setSpecialPopupMessage(message);
    if (specialPopupTimerRef.current) {
      window.clearTimeout(specialPopupTimerRef.current);
    }
    specialPopupTimerRef.current = window.setTimeout(() => {
      setSpecialPopupMessage("");
      specialPopupTimerRef.current = null;
    }, 3000);
  };

  const updatePlayback = (nextPlayback) => {
    if (!session?.roomId || !isConnected) return;
    socket.emit("playback:update", { roomId: session.roomId, playback: nextPlayback });
    setSession((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        playback: {
          ...prev.playback,
          ...nextPlayback,
        },
        playbackSyncedAt: Date.now(),
      };
    });
  };

  const createRoom = () => {
    if (!ensureConnected()) return;
    const stableName = ensureName();

    setError("");
    setInfo("");
    setProfileName(stableName);
    socket.timeout(10000).emit("room:create", { name: stableName }, (err, response) => {
      if (err || !response?.ok) {
        setError(response?.error || "Unable to create room right now.");
        return;
      }

      writeStoredSession({
        roomId: response.room.roomId,
        memberId: response.memberId,
        name: stableName,
      });

      setSession({
        ...response.room,
        socketId: response.socketId,
        memberId: response.memberId,
        selfName: stableName,
        playbackSyncedAt: Date.now(),
      });
      setRoomInput(response.room.roomId);
      setInfo(`Room ${response.room.roomId} created.`);
      showSpecialLovePopup(stableName);
    });
  };

  const joinRoom = () => {
    if (!ensureConnected()) return;

    const roomId = roomInput.trim().toUpperCase();
    if (!roomId) {
      setError("Enter a room code.");
      return;
    }

    const stableName = ensureName();
    const saved = readStoredSession();
    const memberId = saved?.roomId === roomId ? saved.memberId : undefined;

    setError("");
    setInfo("");
    setProfileName(stableName);
    socket.timeout(10000).emit(
      "room:join",
      { roomId, name: stableName, memberId },
      (err, response) => {
        if (err || !response?.ok) {
          setError(response?.error || "Unable to join room.");
          return;
        }

        writeStoredSession({
          roomId: response.room.roomId,
          memberId: response.memberId,
          name: stableName,
        });

        setSession({
          ...response.room,
          socketId: response.socketId,
          memberId: response.memberId,
          selfName: stableName,
          playbackSyncedAt: Date.now(),
        });
        setInfo(`Joined room ${response.room.roomId}.`);
      }
    );
  };

  const leaveRoom = () => {
    if (session?.roomId && socket.connected) {
      socket.emit("room:leave", { roomId: session.roomId });
    }
    clearStoredSession();
    setSession(null);
    setMediaType("youtube");
    setMediaUrl("");
    setChatInput("");
    setInfo("");
    setError("");
    setIsFullView(false);
    setIsStickerPickerOpen(false);
    playerRef.current = null;
  };

  const applyMedia = () => {
    if (!session?.roomId || !ensureConnected()) return;

    if (mediaType === "youtube") {
      const videoId = extractYouTubeId(mediaUrl);
      if (!videoId) {
        setError("Please provide a valid YouTube link.");
        return;
      }
      socket.timeout(10000).emit(
        "media:set",
        {
          roomId: session.roomId,
          media: { type: "youtube", url: mediaUrl.trim(), videoId },
        },
        (err, response) => {
          if (err || !response?.ok) {
            setError(response?.error || "Could not load media.");
            return;
          }
          setError("");
          setInfo("YouTube video loaded for everyone.");
          if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) {
            setIsMediaPanelOpen(false);
          }
        }
      );
      return;
    }

    if (!/^https?:\/\/(www\.)?netflix\.com/i.test(mediaUrl.trim())) {
      setError("Please provide a valid Netflix URL.");
      return;
    }

    socket.timeout(10000).emit(
      "media:set",
      {
        roomId: session.roomId,
        media: { type: "netflix", url: mediaUrl.trim(), videoId: "" },
      },
      (err, response) => {
        if (err || !response?.ok) {
          setError(response?.error || "Could not set Netflix mode.");
          return;
        }
        setError("");
        setInfo("Netflix sync mode enabled.");
        if (typeof window !== "undefined" && window.matchMedia("(max-width: 760px)").matches) {
          setIsMediaPanelOpen(false);
        }
      }
    );
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!chatInput.trim() || !session?.roomId || !ensureConnected()) return;

    socket.timeout(8000).emit(
      "chat:send",
      { roomId: session.roomId, message: chatInput.trim() },
      (err, response) => {
        if (err || !response?.ok) {
          setError(response?.error || "Message failed to send.");
          return;
        }
        setChatInput("");
      }
    );
  };

  const sendSticker = (stickerKey) => {
    if (!session?.roomId || !ensureConnected()) return;
    if (!STICKERS.some((sticker) => sticker.key === stickerKey)) return;

    socket.timeout(8000).emit(
      "chat:send",
      { roomId: session.roomId, sticker: stickerKey },
      (err, response) => {
        if (err || !response?.ok) {
          setError(response?.error || "Sticker failed to send.");
          return;
        }
        setIsStickerPickerOpen(false);
      }
    );
  };

  const sendRemoteSticker = (stickerAsset) => {
    if (!session?.roomId || !ensureConnected()) return;
    if (!stickerAsset?.url || stickerAsset.provider !== "tenor") return;

    socket.timeout(8000).emit(
      "chat:send",
      {
        roomId: session.roomId,
        stickerAsset: {
          provider: "tenor",
          label: stickerAsset.label,
          url: stickerAsset.url,
          previewUrl: stickerAsset.previewUrl || stickerAsset.url,
        },
      },
      (err, response) => {
        if (err || !response?.ok) {
          setError(response?.error || "Sticker failed to send.");
          return;
        }
        setIsStickerPickerOpen(false);
      }
    );
  };

  const onYouTubeReady = (event) => {
    playerRef.current = event.target;
  };

  const onYouTubeStateChange = (event) => {
    if (!session || session.media?.type !== "youtube" || suppressLocalSync.current) return;

    const state = event.data;
    const yt = event.target;
    const currentTime = yt.getCurrentTime?.() || 0;
    const playbackRate = yt.getPlaybackRate?.() || 1;

    if (state === 1) {
      updatePlayback({ isPlaying: true, currentTime, playbackRate });
      return;
    }
    if (state === 2) {
      updatePlayback({ isPlaying: false, currentTime, playbackRate });
      return;
    }
    if (state === 0) {
      updatePlayback({ isPlaying: false, currentTime: 0, playbackRate: 1 });
    }
  };

  const onYouTubeRateChange = (event) => {
    if (suppressLocalSync.current || !session || session.media?.type !== "youtube") return;
    const yt = event.target;
    updatePlayback({
      playbackRate: yt.getPlaybackRate?.() || 1,
      currentTime: yt.getCurrentTime?.() || 0,
    });
  };

  const youtubeOpts = {
    width: "100%",
    height: "100%",
    playerVars: {
      autoplay: 0,
      rel: 0,
      modestbranding: 1,
      playsinline: 1,
      origin: window.location.origin,
    },
  };

  const renderLoveBackground = () => (
    <div className="hearts-bg" aria-hidden="true">
      {LOVE_PARTICLES.map((particle) => (
        <span
          key={particle.id}
          className={`heart ${particle.kind === "tag" ? "heart-tag" : ""}`}
          style={{
            "--heart-left": particle.left,
            "--heart-size": particle.size,
            "--heart-duration": particle.duration,
            "--heart-delay": particle.delay,
            "--heart-sway-mid": particle.swayMid,
            "--heart-sway-end": particle.swayEnd,
            "--heart-opacity": particle.opacity,
            "--heart-color": particle.color,
          }}
        >
          {particle.kind === "tag" ? particle.label : "\u2665"}
        </span>
      ))}
    </div>
  );

  const renderHeartRain = () =>
    heartRainBursts.length ? (
      <div className="heart-rain-overlay" aria-hidden="true">
        {heartRainBursts.flatMap((burst) =>
          burst.particles.map((particle) => (
            <span
              key={particle.id}
              className="heart-rain-drop"
              style={{
                "--rain-left": particle.left,
                "--rain-delay": particle.delay,
                "--rain-duration": particle.duration,
                "--rain-size": particle.size,
                "--rain-drift": particle.drift,
                "--rain-opacity": particle.opacity,
                "--rain-rotate": particle.rotate,
              }}
            >
              {particle.icon}
            </span>
          ))
        )}
      </div>
    ) : null;

  const renderKissRain = () =>
    kissRainBursts.length ? (
      <div className="kiss-rain-overlay" aria-hidden="true">
        {kissRainBursts.flatMap((burst) =>
          burst.particles.map((particle) => (
            <span
              key={particle.id}
              className={`heart-rain-drop ${particle.className || ""}`}
              style={{
                "--rain-left": particle.left,
                "--rain-delay": particle.delay,
                "--rain-duration": particle.duration,
                "--rain-size": particle.size,
                "--rain-drift": particle.drift,
                "--rain-opacity": particle.opacity,
                "--rain-rotate": particle.rotate,
              }}
            >
              {particle.icon}
            </span>
          ))
        )}
      </div>
    ) : null;

  const renderSpecialPopup = () =>
    specialPopupMessage ? (
      <div className="special-love-popup" role="status" aria-live="polite">
        <span className="special-love-popup-heart">{HEART_ICON}</span>
        <span>{specialPopupMessage}</span>
        <span className="special-love-popup-heart">{HEART_ICON}</span>
      </div>
    ) : null;

  const renderMascotPictures = (variant = "compact") => (
    <div className={`mascot-pictures ${variant}`} aria-hidden="true">
      {variant === "compact" ? (
        <>
          <div className="mascot-card panda-card">
            <img src={pandaSticker} alt="" className="mascot-image" />
            <span>Panda hugs</span>
          </div>
          <div className="mascot-card penguin-card">
            <img src={penguinSticker} alt="" className="mascot-image" />
            <span>Penguin kisses</span>
          </div>
        </>
      ) : null}
    </div>
  );

  if (!session) {
    return (
      <>
        {renderSpecialPopup()}
        <div className="landing">
          {renderLoveBackground()}
          <div className="panel">
            <div className="panel-cuddle" aria-hidden="true">
              <img src={cuddleMascot} alt="" className="panel-cuddle-image" />
            </div>
            <p className="love-tag">Made with love for {LOVE_NAME}</p>
            <h1>Teleparty Love {"\u2665"}</h1>
            <p>Create a room, share a YouTube or Netflix link, and watch together with live chat.</p>
            <p className="nunu-note">Date night mode is on {"\u2728"}</p>
            <label htmlFor="name-input">Your name</label>
            <input
              id="name-input"
              value={profileName}
              onChange={(event) => setProfileName(event.target.value)}
              placeholder="Enter your name"
              maxLength={24}
            />
            <div className="row">
              <button onClick={createRoom}>Create Room</button>
            </div>
            <label htmlFor="room-input">Room code</label>
            <div className="row">
              <input
                id="room-input"
                value={roomInput}
                onChange={(event) => setRoomInput(event.target.value)}
                placeholder="ABC123"
                maxLength={6}
              />
              <button onClick={joinRoom}>Join</button>
            </div>
            <p className={`status ${isConnected ? "online" : "offline"}`}>{connectionLabel}</p>
            {error ? <p className="error">{error}</p> : null}
            {info ? <p className="info">{info}</p> : null}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      {renderSpecialPopup()}
      {renderHeartRain()}
      {renderKissRain()}
      <div
        className={`app-shell ${isFullView ? "full-view" : ""} ${
          isChatComposerFocused ? "keyboard-open" : ""
        }`}
      >
        {!isFullView ? renderLoveBackground() : null}
        {!isFullView ? renderMascotPictures("compact") : null}
      {!isFullView ? (
        <header className="topbar">
          <div>
            <h2>{LOVE_NAME}'s Cozy Room {"\u2665"}</h2>
            <p>Code: {session.roomId}</p>
            <p>{session.members?.filter((member) => member.isOnline).length || 0} online</p>
          </div>
          <div className="topbar-actions">
            <span className={`connection-pill ${isConnected ? "online" : "offline"}`}>
              {connectionLabel}
            </span>
            {!isSoundReady ? (
              <button
                type="button"
                className="secondary sound-btn"
                onClick={enableSoundOnDevice}
                aria-label="Enable sound"
                title="Enable sound"
              >
                🔊
              </button>
            ) : null}
            <button
              type="button"
              className="secondary kiss-rain-btn"
              onClick={triggerKissRain}
              aria-label="Start kisses rain"
              title="Start kisses rain"
            >
              {KISS_ICON}
            </button>
            <button
              type="button"
              className="secondary heart-rain-btn"
              onClick={triggerHeartRain}
              aria-label="Start heart rain"
              title="Start heart rain"
            >
              {HEART_ICON}
            </button>
            <button
              type="button"
              className="secondary bell-btn"
              onClick={ringBell}
              disabled={Date.now() < bellCooldownUntil}
              aria-label="Ring bell"
              title="Ring bell"
            >
              {BELL_ICON}
            </button>
            <button type="button" className="secondary" onClick={() => setIsFullView(true)}>
              Full View
            </button>
            <button className="secondary" onClick={leaveRoom}>
              Leave
            </button>
          </div>
        </header>
      ) : (
        <div className="focus-toolbar">
          {!isSoundReady ? (
            <button
              type="button"
              className="secondary sound-btn"
              onClick={enableSoundOnDevice}
              aria-label="Enable sound"
              title="Enable sound"
            >
              🔊
            </button>
          ) : null}
          <button
            type="button"
            className="secondary kiss-rain-btn"
            onClick={triggerKissRain}
            aria-label="Start kisses rain"
            title="Start kisses rain"
          >
            {KISS_ICON}
          </button>
          <button
            type="button"
            className="secondary heart-rain-btn"
            onClick={triggerHeartRain}
            aria-label="Start heart rain"
            title="Start heart rain"
          >
            {HEART_ICON}
          </button>
          <button
            type="button"
            className="secondary bell-btn"
            onClick={ringBell}
            disabled={Date.now() < bellCooldownUntil}
            aria-label="Ring bell"
            title="Ring bell"
          >
            {BELL_ICON}
          </button>
          <button type="button" className="secondary" onClick={() => setIsFullView(false)}>
            Exit Full View
          </button>
          <button type="button" className="secondary" onClick={leaveRoom}>
            Leave
          </button>
        </div>
      )}

      <main className="content">
        <section className="watch-area">
          {!isFullView ? (
            <>
              <button
                type="button"
                className="media-toggle secondary"
                onClick={() => setIsMediaPanelOpen((value) => !value)}
              >
                {isMediaPanelOpen ? "Hide media controls ▲" : "Show media controls ▼"}
              </button>

              {isMediaPanelOpen ? (
                <div className="media-controls">
                  <select value={mediaType} onChange={(event) => setMediaType(event.target.value)}>
                    <option value="youtube">YouTube</option>
                    <option value="netflix">Netflix</option>
                  </select>
                  <input
                    value={mediaUrl}
                    onChange={(event) => setMediaUrl(event.target.value)}
                    placeholder={
                      mediaType === "youtube" ? "Paste YouTube link" : "Paste Netflix title link"
                    }
                  />
                  <button onClick={applyMedia}>Load</button>
                </div>
              ) : (
                <p className="media-collapsed-note">Media controls collapsed to keep chat visible.</p>
              )}
            </>
          ) : null}

          {session.media?.type === "youtube" && session.media?.videoId ? (
            <div className="player-wrap">
              <YouTube
                videoId={session.media.videoId}
                opts={youtubeOpts}
                className="youtube-frame"
                iframeClassName="youtube-iframe"
                onReady={onYouTubeReady}
                onStateChange={onYouTubeStateChange}
                onPlaybackRateChange={onYouTubeRateChange}
              />
            </div>
          ) : null}

          {session.media?.type === "youtube" && !session.media?.videoId ? (
            <div className="empty-player">
              <p>No video loaded yet. Add a YouTube link to start watching.</p>
            </div>
          ) : null}

          {session.media?.type === "netflix" ? (
            <div className="netflix-box">
              <p>
                Netflix blocks in-app embedding because of DRM and browser security policies. Open the
                same Netflix link on each phone and use these synced controls + chat to watch together.
              </p>
              <div className="netflix-actions">
                <a href={session.media.url || "#"} target="_blank" rel="noreferrer">
                  Open Netflix Link
                </a>
                <span>Synced timer: {formatClock(computedPlayback?.currentTime || 0)}</span>
              </div>
              <div className="sync-buttons">
                <button
                  onClick={() =>
                    updatePlayback({
                      isPlaying: !(computedPlayback?.isPlaying || false),
                      currentTime: computedPlayback?.currentTime || 0,
                      playbackRate: 1,
                    })
                  }
                >
                  {computedPlayback?.isPlaying ? "Pause Sync" : "Play Sync"}
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    updatePlayback({
                      currentTime: Math.max(0, (computedPlayback?.currentTime || 0) - 10),
                    })
                  }
                >
                  -10s
                </button>
                <button
                  className="secondary"
                  onClick={() =>
                    updatePlayback({
                      currentTime: (computedPlayback?.currentTime || 0) + 10,
                    })
                  }
                >
                  +10s
                </button>
              </div>
            </div>
          ) : null}
          {error ? <p className="error">{error}</p> : null}
          {info ? <p className="info">{info}</p> : null}
        </section>

        <aside className="chat-area">
          <div className="member-list">
            {session.members?.map((member) => (
              <span
                key={member.memberId}
                className={`${member.isOnline ? "online" : "away"} ${
                  member.memberId === session.memberId ? "self" : ""
                }`}
              >
                {member.name}
                {member.memberId === session.memberId ? " (You)" : ""}
              </span>
            ))}
          </div>
          <div className="chat-messages" ref={chatMessagesRef}>
            {(session.messages || []).map((message) => (
              <div className={`message ${message.type === "sticker" ? "sticker-message" : ""}`} key={message.id}>
                <strong>{message.sender}</strong>
                {message.sticker || message.stickerAsset ? (
                  <div className="sticker-bubble">
                    <img
                      src={message.stickerAsset?.url || STICKER_MAP[message.sticker]?.src || pandaSticker}
                      alt={message.stickerAsset?.label || message.sticker || "Sticker"}
                      className="sticker-image"
                    />
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
              </div>
            ))}
          </div>
          <div className="chat-tools">
            <button
              type="button"
              className="secondary sticker-toggle"
              onClick={() => setIsStickerPickerOpen((value) => !value)}
            >
              {isStickerPickerOpen ? "Hide Stickers" : "Stickers"}
            </button>
            {isStickerPickerOpen ? (
              <div className="sticker-picker-panel">
                {TENOR_API_KEY ? (
                  <div className="sticker-search">
                    <input
                      type="text"
                      value={stickerQuery}
                      onChange={(event) => setStickerQuery(event.target.value)}
                      placeholder="Search cute online stickers"
                    />
                    <small>Online stickers powered by Tenor</small>
                  </div>
                ) : (
                  <p className="sticker-helper">
                    Add `VITE_TENOR_API_KEY` if you want searchable online stickers too.
                  </p>
                )}

                <div className="sticker-section">
                  <span className="sticker-section-label">Cute Pack</span>
                  <div className="sticker-picker">
                    {STICKERS.map((sticker) => (
                      <button
                        key={sticker.key}
                        type="button"
                        className="sticker-btn"
                        onClick={() => sendSticker(sticker.key)}
                        title={sticker.label}
                      >
                        <img src={sticker.src} alt={sticker.label} className="sticker-thumb" />
                        <small>{sticker.label}</small>
                      </button>
                    ))}
                  </div>
                </div>

                {TENOR_API_KEY ? (
                  <div className="sticker-section">
                    <span className="sticker-section-label">Tenor Stickers</span>
                    {isRemoteStickersLoading ? (
                      <p className="sticker-helper">Loading cute stickers...</p>
                    ) : remoteStickerError ? (
                      <p className="sticker-helper">{remoteStickerError}</p>
                    ) : remoteStickers.length ? (
                      <div className="sticker-picker">
                        {remoteStickers.map((sticker) => (
                          <button
                            key={sticker.id}
                            type="button"
                            className="sticker-btn"
                            onClick={() => sendRemoteSticker(sticker)}
                            title={sticker.label}
                          >
                            <img src={sticker.previewUrl || sticker.url} alt={sticker.label} className="sticker-thumb" />
                            <small>{sticker.label}</small>
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="sticker-helper">No online stickers yet. Try searching something cute.</p>
                    )}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
          <form className="chat-form" onSubmit={sendMessage}>
            <input
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
              onFocus={() => setIsChatComposerFocused(true)}
              onBlur={() => setIsChatComposerFocused(false)}
              placeholder="Type message"
              maxLength={500}
            />
            <button type="submit">Send</button>
          </form>
        </aside>
        </main>
      </div>
    </>
  );
}

export default App;
