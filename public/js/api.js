// Helper condiviso per chiamate API, gestione token JWT e cambio tab UI.
window.PharmaAPI = (() => {
  const TOKEN_KEY = 'pharmapuglia_token';

  function getToken() {
    return localStorage.getItem(TOKEN_KEY);
  }

  function setToken(token) {
    localStorage.setItem(TOKEN_KEY, token);
  }

  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  async function request(url, options = {}) {
    const headers = new Headers(options.headers || {});
    const token = getToken();
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `Errore HTTP ${res.status}`);
    }
    return data;
  }

  function showFeedback(message, type = 'info') {
    const el = document.getElementById('global-feedback');
    if (!el) return;
    el.textContent = message;
    el.dataset.type = type;
    el.classList.remove('is-hidden');
  }

  function hideFeedback() {
    const el = document.getElementById('global-feedback');
    if (!el) return;
    el.classList.add('is-hidden');
  }

  function initTabs() {
    const buttons = document.querySelectorAll('.nav-tab[data-tab]');
    const panels = document.querySelectorAll('.tab-panel');

    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const target = btn.dataset.tab;
        buttons.forEach((b) => b.classList.toggle('is-active', b === btn));
        panels.forEach((panel) => {
          panel.classList.toggle('is-hidden', panel.id !== `tab-${target}`);
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', initTabs);

  return {
    getToken,
    setToken,
    clearToken,
    request,
    showFeedback,
    hideFeedback
  };
})();
