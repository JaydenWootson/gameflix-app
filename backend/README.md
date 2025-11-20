# Backend — Quick Start & Notes

This small README explains how to start the backend server included in this repo, how to change the port, and why a couple of dependencies were pinned.

Quick start

1. Install dependencies (from the project root or backend folder):

   ```bash
   cd backend
   npm install
   ```

2. Start the server (default port is 5000):

   ```bash
   npm start
   ```

Override the port (useful when port 5000 is in use)

You can set the `PORT` environment variable when starting the server. For example, to run on port 5001:

```bash
PORT=5001 npm start
# or, directly with node:
PORT=5001 node server.js
```

Stopping the server

- If you started the server in the foreground, press `Ctrl+C` in the terminal.
- If you started it in the background, find the PID and kill it (example):

```bash
lsof -iTCP:5001 -sTCP:LISTEN -n -P
# note the PID column, then:
kill <PID>
```

Why dependencies were changed

- `jsonwebtoken` was pinned to `^8.5.1` because v9 of `jsonwebtoken` is ESM-only and will break CommonJS code that uses `require()`.
- `express` was pinned to `^4.18.2` to avoid unexpected breaking changes from an Express 5.x install in projects written for Express 4.x.

Notes

- The server now reads the port from the environment (`process.env.PORT || 5000`). This makes it easy to start on a different port when the default is unavailable.
- If a system/service keeps re-binding port 5000 (macOS system services or other apps), prefer starting the backend on another free port rather than killing unknown system processes.

If you'd like I can add an npm script to start on a specific port (for example `start:dev`) or a small `Makefile` helper — tell me which you prefer.

Last updated: 2025-11-20
