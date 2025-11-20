(function () {
  // Configuration
  const BACKEND_BASE = window.__BACKEND_URL__ || '/';

  // Helpers
  function getEl(selector) {
    return document.querySelector(selector);
  }

  function createEl(tag, attrs = {}, text = '') {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
    if (text) el.textContent = text;
    return el;
  }

  function setText(el, text) {
    if (el) el.textContent = text;
  }

  // UI
  function ensureUI() {
    let container = getEl('#app-root');
    if (!container) {
      container = createEl('div', { id: 'app-root' });
      document.body.prepend(container);
    }

    let status = getEl('#server-status');
    if (!status) {
      status = createEl('div', { id: 'server-status', role: 'status' }, 'Loading...');
      container.appendChild(status);
    }

    let refresh = getEl('#refresh-btn');
    if (!refresh) {
      refresh = createEl('button', { id: 'refresh-btn', type: 'button' }, 'Refresh');
      container.appendChild(refresh);
    }

    return { container, status, refresh };
  }

  function showStatus(statusEl, ok, message) {
    if (!statusEl) return;
    statusEl.classList.remove('ok', 'error');
    statusEl.classList.add(ok ? 'ok' : 'error');
    statusEl.textContent = ok ? `OK — ${message}` : `ERROR — ${message}`;
  }

  // Network with timeout
  async function fetchWithTimeout(url, options = {}, ms = 5000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), ms);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(id);
      return res;
    } catch (err) {
      clearTimeout(id);
      throw err;
    }
  }

  async function fetchServerHealth() {
    const urlsToTry = [
      `${BACKEND_BASE}api/health`,
      `${BACKEND_BASE}health`,
      `${BACKEND_BASE}`
    ];
    let lastErr = null;
    for (const u of urlsToTry) {
      try {
        const res = await fetchWithTimeout(u, { method: 'GET' }, 4000);
        if (!res.ok) {
          lastErr = new Error(`HTTP ${res.status} ${res.statusText} from ${u}`);
          continue;
        }
        // try parse JSON, but accept plain text
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const json = await res.json();
          return { url: u, ok: true, data: json };
        } else {
          const text = await res.text();
          return { url: u, ok: true, data: text };
        }
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('No health endpoints responded');
  }

  // Initialization
  async function init() {
    const { status, refresh } = ensureUI();

    async function update() {
      setText(status, 'Checking server...');
      try {
        const result = await fetchServerHealth();
        const summary = typeof result.data === 'string' ? result.data : (result.data.message || JSON.stringify(result.data));
        showStatus(status, true, `${summary} (from ${result.url})`);
      } catch (err) {
        showStatus(status, false, err.message || String(err));
      }
    }

    refresh.addEventListener('click', () => {
      update();
    });

    // initial check
    update();
  }

  // Expose for tests/debugging
  window.App = window.App || {};
  window.App.init = init;
  window.App.fetchServerHealth = fetchServerHealth;

  // Auto-run if DOM ready
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init().catch(() => {});
  } else {
    document.addEventListener('DOMContentLoaded', () => init().catch(() => {}));
  }
})();