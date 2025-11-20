/*
  dev-diagnostics.js
  A lightweight in-browser diagnostic tool to help troubleshoot ERR_CONNECTION_RESET and related issues
  - Plain JavaScript, no Node required
  - Drop into any static HTML project and include with <script src="dev-diagnostics.js"></script>

  Checks performed:
  1) Detects if the page was opened via file:// (which commonly causes local request issues)
  2) Probes localhost on common dev ports (5500, 3000, 8080) to detect running dev servers
  3) Attempts an external fetch to determine if outbound requests are blocked (heuristic for proxy/VPN/firewall)
  4) Checks navigator.onLine for offline network adapter state
  5) Logs helpful messages to the console and shows an on-page panel with beginner-friendly actions

  Limitations:
  - Browser JS cannot reliably detect system VPN/proxy state; this script uses heuristics (external fetch failures)
  - The script cannot restart your server; it instead provides copyable commands and instructions
*/

(function () {
  'use strict';

  // --- Configuration -------------------------------------------------------
  const LOCAL_PORTS = [5500, 3000, 8080]; // common ports (Live Server, CRA, etc.)
  const LOCAL_PATH = '/';
  const EXTERNAL_IP_URL = 'https://api.ipify.org?format=json'; // public IP endpoint (CORS-friendly)
  const EXTERNAL_TIMEOUT = 4000; // ms for external fetch
  const LOCAL_TIMEOUT = 2000; // ms per localhost port check

  // --- Logging helpers ----------------------------------------------------
  function logInfo(...args) { console.info('[dev-diagnostics]', ...args); }
  function logWarn(...args) { console.warn('[dev-diagnostics]', ...args); }
  function logError(...args) { console.error('[dev-diagnostics]', ...args); }

  // Promise-based fetch with timeout
  function fetchWithTimeout(url, timeoutMs, options = {}) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      fetch(url, options).then(res => { clearTimeout(timer); resolve(res); }).catch(err => { clearTimeout(timer); reject(err); });
    });
  }

  // --- UI: floating diagnostics panel -------------------------------------
  function ensurePanel() {
    let panel = document.getElementById('dev-diagnostics-panel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'dev-diagnostics-panel';
    // Basic styling so the panel is visible but unobtrusive
    Object.assign(panel.style, {
      position: 'fixed', right: '12px', bottom: '12px', maxWidth: '460px',
      background: 'rgba(10,10,10,0.9)', color: '#fff', fontFamily: 'system-ui, Arial, sans-serif',
      fontSize: '13px', borderRadius: '8px', padding: '12px', zIndex: 999999,
      boxShadow: '0 6px 18px rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)'
    });

    const header = document.createElement('div');
    header.style.display = 'flex'; header.style.justifyContent = 'space-between'; header.style.alignItems = 'center'; header.style.marginBottom = '8px';

    const title = document.createElement('strong'); title.textContent = 'Dev Connection Diagnostics'; header.appendChild(title);

    const closeBtn = document.createElement('button'); closeBtn.textContent = '✕'; closeBtn.title = 'Close panel';
    Object.assign(closeBtn.style, { background: 'transparent', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '14px' });
    closeBtn.onclick = () => { panel.style.display = 'none'; };
    header.appendChild(closeBtn);

    panel.appendChild(header);

    const messages = document.createElement('div'); messages.id = 'dev-diagnostics-messages'; panel.appendChild(messages);

    const actions = document.createElement('div'); actions.id = 'dev-diagnostics-actions'; actions.style.marginTop = '10px'; actions.style.display = 'flex'; actions.style.flexDirection = 'column'; actions.style.gap = '8px';
    panel.appendChild(actions);

    document.body.appendChild(panel);
    return panel;
  }

  function addMessage(level, text, moreHtml) {
    const container = ensurePanel().querySelector('#dev-diagnostics-messages');
    const row = document.createElement('div');
    row.style.marginBottom = '8px';
    const bg = level === 'error' ? 'rgba(255,0,0,0.06)' : (level === 'warn' ? 'rgba(255,165,0,0.04)' : 'rgba(0,255,0,0.03)');
    row.style.padding = '8px'; row.style.borderRadius = '6px'; row.style.background = bg; row.style.lineHeight = '1.3';
    row.innerHTML = `<div style="font-weight:600;color:#fff;margin-bottom:4px">${text}</div>${moreHtml || ''}`;
    container.appendChild(row);
  }

  function addActionButton(label, onClick, hint) {
    const actions = ensurePanel().querySelector('#dev-diagnostics-actions');
    const btn = document.createElement('button'); btn.textContent = label;
    Object.assign(btn.style, { padding: '8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.12)', background: 'rgba(255,255,255,0.03)', color: '#fff', cursor: 'pointer' });
    btn.onclick = onClick; actions.appendChild(btn);
    if (hint) {
      const hintEl = document.createElement('div'); hintEl.style.fontSize = '12px'; hintEl.style.opacity = '0.85'; hintEl.style.marginTop = '6px'; hintEl.style.color = '#ddd'; hintEl.textContent = hint; actions.appendChild(hintEl);
    }
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      try {
        const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); resolve();
      } catch (err) { reject(err); }
    });
  }

  // --- Check 1: Detect file:// protocol ----------------------------------
  function checkFileProtocol() {
    logInfo('Checking page protocol');
    if (location.protocol === 'file:') {
      logWarn('Page opened via file:// — this can cause request/CORS issues.');
      addMessage('warn', 'Page loaded via file:// (local file).', `<div style="color:#ddd;font-size:12px">Browsers sometimes block requests or CORS when opening HTML files directly. Recommended fixes:<ul style="margin:6px 0 0 18px;color:#ddd"><li>Run a local server and open http://localhost:PORT</li><li>Or (advanced) run Chrome with <code>--allow-file-access-from-files</code></li></ul></div>`);
      addActionButton('Open Live Server docs', () => window.open('https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer', '_blank'), 'VS Code Live Server extension (easy)');
      addActionButton('Copy: start simple server (Python)', () => copyToClipboard('python3 -m http.server 5500').then(()=> addMessage('info','Command copied: python3 -m http.server 5500','<div style="color:#ddd">Run in your project folder and open http://localhost:5500</div>')));
    } else {
      logInfo('Page protocol OK:', location.protocol);
      addMessage('info', `Page opened over ${location.protocol}`, `<div style="color:#ddd">This page is not loaded via file:// — file protocol issues do not apply.</div>`);
    }
  }

  // --- Check 2: Probe localhost ports ------------------------------------
  async function checkLocalServers() {
    logInfo('Probing localhost ports', LOCAL_PORTS);
    addMessage('info', 'Checking local dev servers (ports: ' + LOCAL_PORTS.join(', ') + ')', '<div style="color:#ddd">This tests whether a dev server (Live Server, CRA, etc.) is running.</div>');
    const results = [];
    for (const port of LOCAL_PORTS) {
      const url = `http://localhost:${port}${LOCAL_PATH}?_dev_diag=${Date.now()}`;
      try {
        // Use no-cors so the request can resolve against servers without CORS
        await fetchWithTimeout(url, LOCAL_TIMEOUT, { method: 'GET', mode: 'no-cors' });
        logInfo(`localhost:${port} appears to be responding.`);
        results.push({ port, ok: true });
      } catch (err) {
        logWarn(`localhost:${port} did not respond:`, err.message || err);
        results.push({ port, ok: false, info: err.message });
      }
    }

    const up = results.filter(r => r.ok);
    if (up.length > 0) {
      addMessage('info', 'Local dev server detected', `<div style="color:#ddd">Responding port(s): ${up.map(r=>r.port).join(', ')} — try opening <strong>http://localhost:${up[0].port}</strong></div>`);
    } else {
      addMessage('warn', 'No local dev server detected', `<div style="color:#ddd">No responses on ${LOCAL_PORTS.join(', ')}. If you expected a server, try restarting it (Live Server / npm start).</div>`);
      addActionButton('Copy: npm start', () => copyToClipboard('npm start').then(()=> addMessage('info','Copied: npm start','<div style="color:#ddd">Run in your project folder if supported.</div>')));
    }
    console.log('[dev-diagnostics] Local server probe results:', results);
    return results;
  }

  // --- Check 3: External connectivity (heuristic for proxy/VPN) -----------
  async function checkExternalConnectivity() {
    logInfo('Fetching external IP to check outbound connectivity');
    addMessage('info', 'Checking external connectivity...', '<div style="color:#ddd">Attempting to fetch your public IP — failures may indicate proxy/VPN/firewall blocking outbound requests.</div>');
    try {
      const res = await fetchWithTimeout(EXTERNAL_IP_URL, EXTERNAL_TIMEOUT, { cache: 'no-store' });
      const json = await res.json();
      logInfo('External IP:', json);
      addMessage('info', 'External connectivity OK', `<div style="color:#ddd">Public IP: ${json.ip}</div>`);
      return { ok: true, ip: json.ip };
    } catch (err) {
      logWarn('External fetch failed:', err.message || err);
      addMessage('warn', 'Unable to fetch external IP', `<div style="color:#ddd">This may indicate a system proxy, VPN, or firewall. Try temporarily disabling VPN/proxy and re-run.</div>`);
      addActionButton('Proxy/VPN help', () => window.open('https://www.howtogeek.com/192640/how-to-disable-your-vpn-or-turn-it-off-on-windows-and-mac/', '_blank'));
      addActionButton('macOS proxy check', () => addMessage('info','macOS proxy check','<div style="color:#ddd">System Settings → Network → Advanced → Proxies → Uncheck any proxies</div>'));
      addActionButton('Windows proxy check', () => addMessage('info','Windows proxy check','<div style="color:#ddd">Settings → Network & Internet → Proxy → Turn off Use a proxy server</div>'));
      return { ok: false, error: err.message };
    }
  }

  // --- Check 4: Network adapter online/offline -----------------------------
  async function checkNetworkAdapter() {
    logInfo('Checking navigator.onLine');
    const online = navigator.onLine;
    if (!online) {
      logWarn('Navigator reports offline');
      addMessage('error', 'Network appears offline', '<div style="color:#ddd">Your browser reports you are offline. Reconnect to the network and retry.</div>');
      addActionButton('Network troubleshooting', () => window.open('https://support.google.com/chrome/answer/95647?hl=en', '_blank'));
      return { online: false };
    }
    addMessage('info', 'Network adapter: online', '<div style="color:#ddd">Browser reports an active network connection.</div>');
    try {
      // Lightweight fetch to example.com to confirm outbound connectivity (HEAD with no-cors allowed)
      await fetchWithTimeout('https://example.com/', 3000, { method: 'HEAD', mode: 'no-cors' });
      logInfo('Outbound connectivity check resolved (example.com).');
      return { online: true, check: 'ok' };
    } catch (err) {
      logWarn('Outbound connectivity check failed:', err.message || err);
      addMessage('warn', 'Connectivity test failed', '<div style="color:#ddd">You appear online but external requests might be blocked by firewall/proxy/VPN.</div>');
      return { online: true, check: 'failed' };
    }
  }

  // --- Orchestrator -------------------------------------------------------
  async function runAllChecks() {
    ensurePanel();
    addMessage('info', 'Starting diagnostics', '<div style="color:#ddd">Running checks to help identify causes for ERR_CONNECTION_RESET when loading local pages.</div>');
    checkFileProtocol();
    const localResults = await checkLocalServers();
    const external = await checkExternalConnectivity();
    const net = await checkNetworkAdapter();

    // Heuristic summaries
    if (location.protocol === 'file:' && localResults.every(r => !r.ok)) {
      addMessage('warn', 'Likely cause: file:// + no dev server', '<div style="color:#ddd">Open the site via http://localhost:PORT (start a server). This often fixes ERR_CONNECTION_RESET in development.</div>');
    }
    if (!external.ok && localResults.some(r => r.ok)) {
      addMessage('warn', 'Pattern: local server OK but external fetch fails', '<div style="color:#ddd">This often indicates a system proxy, VPN, or firewall interfering with outbound traffic.</div>');
    }
    if (!net.online) {
      addMessage('error', 'Network offline — reconnect required', '<div style="color:#ddd">Reconnect to Wi‑Fi or Ethernet and retry.</div>');
    }

    console.group('%cDev Diagnostics Summary', 'color: white; background: #333; padding: 4px 8px; border-radius: 4px;');
    console.log('Protocol:', location.protocol);
    console.log('Local ports checked:', LOCAL_PORTS);
    console.log('Local results:', localResults);
    console.log('External check:', external);
    console.log('Navigator online:', net);
    console.groupEnd();

    addActionButton('Copy checklist for ERR_CONNECTION_RESET', () => {
      copyToClipboard(["Checklist to try:",
        "1. If you opened the HTML with file:// → start a simple server (e.g. python3 -m http.server 5500) and open http://localhost:5500",
        "2. Restart your dev server (Live Server / npm start)",
        "3. If external requests fail → temporarily disable VPN/proxy/firewall and retry",
        "4. If offline → reconnect your network adapter"].join('\n'))
      .then(()=> addMessage('info','Checklist copied to clipboard','<div style="color:#ddd">Paste into terminal or notes.</div>'));
    }, 'Copies a quick troubleshooting checklist');

    addActionButton('Run checks again', () => { const panel = ensurePanel(); panel.querySelector('#dev-diagnostics-messages').innerHTML=''; runAllChecks(); }, 'Re-run diagnostics after changes');
  }

  // Kick off when DOM is ready
  document.addEventListener('DOMContentLoaded', () => {
    try { runAllChecks(); } catch (err) { logError('Diagnostics crashed:', err); addMessage('error','Diagnostics error', `<div style="color:#ddd">${err.message || err}</div>`); }
  });

})();
