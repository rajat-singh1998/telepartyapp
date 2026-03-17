# Teleparty App (React + Node + Socket.IO)

This project is a mobile-responsive Teleparty-style app where users can:

- Create or join rooms
- Watch synced YouTube videos together
- Share a Netflix link and use synced timeline controls
- Chat live inside the same room
- Automatically reconnect and restore room session after short network drops

## Tech Stack

- Frontend: React (Vite), Socket.IO client, `react-youtube`
- Backend: Node.js, Express, Socket.IO
- Realtime sync: WebSocket events for room state, playback, and chat

## Important Netflix Note

Netflix does not allow direct embedding inside third-party web apps due to DRM/security restrictions (`X-Frame-Options`, EME policies).  
So this app implements **Netflix sync mode**:

- Everyone opens the same Netflix URL on their own device/tab
- Room playback clock stays synced in the app
- Users coordinate with shared synced controls + chat

YouTube is fully in-app and synced.

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Optional server env setup:

```bash
cd server
copy .env.example .env
cd ..
```

3. Start both frontend and backend:

```bash
npm run dev
```

4. Open:

- Frontend: `http://localhost:5173`
- Backend health check: `http://localhost:4000/health`

## Go Live (No Paid Server/Domain)

You can deploy publicly using free URLs:

- Frontend: Vercel (`https://your-app.vercel.app`)
- Backend: Render (`https://your-backend.onrender.com`)

### Deploy both frontend and backend on Render

You can also deploy everything on Render from the same repo:

1. Push this repo to GitHub.
2. Go to Render -> New -> Blueprint.
3. Select your repo.
4. Render will read [render.yaml](C:/Users/HP/Desktop/telepartyapp/render.yaml) and create:
   - `teleparty-client` as a Static Site
   - `teleparty-server` as a Web Service
5. Approve the Blueprint and deploy.

The client service is already configured to read the backend public URL from the backend service automatically.

### 1. Deploy backend on Render

1. Push this repo to GitHub.
2. Go to Render -> New -> Blueprint.
3. Select your repo (Render will detect `render.yaml`).
4. After service is created, open the backend service and set env vars:
   - `CLIENT_ORIGIN=https://your-app.vercel.app`
   - `DISCONNECT_GRACE_MS=45000`
   - `ROOM_IDLE_TTL_MS=21600000`
5. Deploy and verify:
   - `https://your-backend.onrender.com/health` returns JSON.

### 2. Deploy frontend on Vercel

1. Go to Vercel -> New Project -> Import same repo.
2. Set **Root Directory** to `client`.
3. Add env var:
   - `VITE_SERVER_URL=https://your-backend.onrender.com`
4. Deploy.

### 3. Final cross-origin update

After Vercel gives your real URL, update Render:

- `CLIENT_ORIGIN=https://your-real-vercel-url.vercel.app`

If needed, you can allow multiple origins (comma-separated), for example:

- `CLIENT_ORIGIN=http://localhost:5173,https://your-real-vercel-url.vercel.app`

### 4. Notes

- Free Render services can sleep when idle, so first request may take time.
- For best always-on experience, use a paid always-on backend plan.
- You do not need to buy a custom domain unless you want a branded URL.

## Project Structure

```text
telepartyapp/
  client/
    src/
      App.jsx
      styles.css
      utils/youtube.js
  server/
    src/index.js
```

## How Sync Works

- Playback updates (`play/pause/seek/rate`) are emitted to server
- Server stores authoritative room playback with timestamp
- Clients compute current shared time from latest sync + elapsed seconds
- Drift correction seeks YouTube player when needed
- Room members are tracked with stable member IDs (not socket IDs), so reconnects can restore the same identity

## Reliability Features

- Socket.IO automatic reconnect with retry backoff
- Auto room restore from local session storage
- Server disconnect grace window (`DISCONNECT_GRACE_MS`) before removing dropped users
- Empty rooms stay reusable for a while before cleanup (`ROOM_IDLE_TTL_MS`)
- Playback and chat actions use ack timeouts to avoid silent failures
- CORS allows comma-separated frontend origins via `CLIENT_ORIGIN`

## Future Upgrades

- Persist rooms/messages in MongoDB
- Add auth (JWT) for named accounts
- Add host controls / moderator permissions
- Add WebRTC voice chat
