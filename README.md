# RouteMates

Find friends along your driving route and meet up.

## Quick Start

### 1. Install dependencies
```bash
cd routemates
npm install          # root (concurrently)
npm run install:all  # server + client
```

### 2. Add your Mapbox token
Get a free token at https://account.mapbox.com → paste it into `client/.env`:
```
VITE_MAPBOX_TOKEN=pk.eyJ1...
```

### 3. Run
```bash
npm run dev
```
- Client: http://localhost:5173
- Server: http://localhost:3001

## Core flow

1. Sign up → set your current city
2. Go to Friends tab → copy invite link → send to friends
3. Friends click link, sign up, connect automatically
4. Go to Drive tab → enter start, end, date → see friends near your route
5. Tap **Ping** to let them know you're passing through
6. Friends respond yes / maybe / no in the Trips tab

## Tech
- React + Vite (frontend)
- Express + SQLite (backend)
- Mapbox GL JS (maps + routing + geocoding)
- JWT auth
