# Dev Diagnostics — Testing Instructions

This document explains how to test the `dev-diagnostics.js` script that helps diagnose ERR_CONNECTION_RESET and related local development networking issues.

File: `frontend/dev-diagnostics.js`

Overview
- The script runs in the browser and shows a floating panel labeled "Dev Connection Diagnostics" in the bottom-right.
- It performs checks for:
  - file:// protocol usage
  - local dev servers on common ports (5500, 3000, 8080)
  - external connectivity (public IP lookup)
  - navigator.online status (network adapter online/offline)

How to include the script
- The repository already includes the script and `index.html` loads it with:

  <script src="dev-diagnostics.js"></script>

Quick checklist (manual)
1. Open a terminal in your project folder.
2. Run a local server (or not) depending on the test case.
3. Open `frontend/index.html` in your browser (preferably via http://localhost:PORT — or test file:// cases below).
4. Look for the floating diagnostics panel and follow the messages.

Testing scenarios

1) Test: Page opened via file:// (expected: warning to use a local server)
- Steps:
  - Open the HTML file directly in the browser by double-clicking `frontend/index.html` (address bar should show file:///...)
  - Observe the diagnostics panel — it should show a warning that the page is loaded via file:// and suggest running a local server.
- Expected result:
  - Panel shows a "Page loaded via file://" warning and provides a copyable command (e.g. `python3 -m http.server 5500`) and links for Live Server.

2) Test: No dev server running (expected: local server probe fails)
- Steps:
  - Ensure you have no local dev server running on ports 5500, 3000, or 8080.
  - Open the page over http (if you can) or file:// — the panel will probe localhost ports.
- Expected result:
  - The panel lists the ports it checked and reports "No local dev server detected." It offers copyable commands like `npm start`.

3) Test: Local dev server running (expected: script detects server)
- Steps:
  - Start a server. Examples:

    # quickly serve with Python 3 on port 5500
    python3 -m http.server 5500

    # or for Node projects that support it
    npm start

  - Open http://localhost:5500 (adjust port if needed) and open developer console.
- Expected result:
  - The diagnostics panel detects a responding port (e.g. 5500) and shows an "Local dev server detected" message.
  - Console includes a summary object with localResults showing which ports responded.

4) Test: External connectivity blocked (heuristic for proxy/VPN/firewall)
- Steps:
  - Simulate outbound network restriction by enabling a system-wide VPN that blocks external requests, or temporarily enable a firewall rule that blocks outbound HTTP(S) from the browser.
  - Open the page and observe the panel.
- Expected result:
  - The external IP fetch (to https://api.ipify.org) times out/fails and the panel shows "Unable to fetch external IP" with instructions to check VPN/proxy/firewall and links to guidance.
  - The panel will not claim a VPN definitively; it uses this failure as a heuristic and provides actionable instructions.

5) Test: Network adapter offline
- Steps:
  - Turn off Wi‑Fi or unplug the Ethernet cable (or use OS networking controls to go offline).
  - Open or reload the page.
- Expected result:
  - The panel shows "Network appears offline" and suggests reconnecting.
  - `navigator.onLine` will be false and the script will show an explicit error message.

How the script logs information (for debugging)
- Open the browser DevTools Console to see a compact summary. The script logs a grouped summary with these fields:
  - Protocol (file: or http:)
  - Local ports checked and results (array of { port, ok })
  - External check result (ok + ip or error)
  - Navigator online status

Example console output (abridged)

  [dev-diagnostics] Local server probe results: [ { port: 5500, ok: true }, { port: 3000, ok: false } ]
  Dev Diagnostics Summary
  Protocol: http:
  Local ports checked: [5500,3000,8080]
  Local results: [...]
  External check: { ok: true, ip: '203.0.113.45' }
  Navigator online: { online: true, check: 'ok' }

Tips and notes
- The script uses `fetch(..., { mode: 'no-cors' })` for localhost probes so it can detect a server even if CORS headers are absent. That returns an opaque response when successful; a resolved fetch indicates a server is listening.
- Browsers do not allow JavaScript to query system VPN or proxy settings directly; the script uses the external fetch failure as a helpful heuristic and gives instructions for manual checks.
- The script cannot restart OS services or your dev server — it offers copyable commands and links to guide the user.

What to do when you see ERR_CONNECTION_RESET
1. If you opened the page with file://, start a local server and open the page with http://localhost:PORT.
2. Restart your dev server (Live Server, `npm start`, or Python simple server) and reload the page.
3. If local server is reachable but external requests fail, temporarily disable VPN/proxy/firewall and retry.
4. If `navigator.onLine` is false, reconnect your network adapter and retry.

If you want more automation
- I can add options to the script to probe additional ports or accept a configurable list of ports via a data attribute on the `<script>` tag. Ask if you'd like that.

Last updated: 2025-11-20
