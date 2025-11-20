# gameflix-app
Game library Netflix/Steam type 
This repository contains a backend (Node/Express) and frontend (static files). Use these instructions to run and test locally.

## Backend (backend/)
- Install dependencies:
  ```bash
  cd backend
  npm install
  ```
- Start dev server (preconfigured to use port 5001):
  ```bash
  cd backend
  npm run start:dev
  ```
  Or:
  ```bash
  PORT=5001 npm start
  ```
  Note: the `start:dev` script uses POSIX env assignment and works on macOS/Linux. For Windows, use `cross-env` if needed.

- Stop the server:
  ```bash
  lsof -iTCP:5001 -sTCP:LISTEN -n -P    # find PID
  kill <PID>
  ```

- Health endpoints tried by frontend:
  - `GET /api/health`
  - `GET /health`
  - `GET /`

## Frontend (frontend/)
- Quick local static server (recommended; do not open files with `file://`):
  ```bash
  cd frontend
  python3 -m http.server 5500
  ```
  Open: `http://localhost:5500/index.html`

- Diagnostic tool: `frontend/dev-diagnostics.js`  
  When you open `frontend/index.html` in the browser (served via HTTP), a floating "Dev Connection Diagnostics" panel appears and runs checks:
  - Detects if the page was loaded via `file://`
  - Probes localhost on common ports (5500, 3000, 8080)
  - Attempts external IP fetch to detect proxy/VPN/firewall issues
  - Reports navigator.onLine status

- Frontend health-check UI: `frontend/app.js`  
  This script shows a small status element and a "Refresh" button. It probes the backend health endpoints listed above.

## Common commands (macOS)
- Install backend deps:
  ```bash
  cd /path/to/gameflix-app/backend
  npm install
  ```
- Start backend on default dev port 5001:
  ```bash
  npm run start:dev
  ```
- Start frontend static server:
  ```bash
  cd /path/to/gameflix-app/frontend
  python3 -m http.server 5500
  ```
- Kill process listening on a port:
  ```bash
  lsof -iTCP:5000 -sTCP:LISTEN -n -P
  kill <PID>
  ```

## Troubleshooting
- If you see `ERR_CONNECTION_RESET`:
  1. Ensure backend is running (check `npm run start:dev`).
  2. Serve frontend over HTTP (do not open with `file://`).
  3. Open the diagnostics panel (it will suggest fixes).
  4. Temporarily disable VPN/proxy or firewall and retry if external fetches fail.

## Notes
- Backend `package.json` pins `jsonwebtoken` to 8.x for CommonJS compatibility.
- Backend default port 5000 may be used by system processes; `start:dev` uses 5001 to avoid conflicts.
- If you want a cross-platform env solution, tell me and I will add `cross-env` and scripts.
