// ITR Desk content script for https://eportal.incometax.gov.in
// 1. Shows a small badge with the active client and a one-click "Fill User ID".
// 2. Autofills the PAN/User ID field on the login page (never the password).
// 3. Best-effort session keep-alive: synthetic activity + auto-dismiss of the
//    "session about to expire" prompt while the tab is open.

(() => {
  if (window.__itrDeskLoaded) return;
  window.__itrDeskLoaded = true;

  let state = { client: null, settings: null, pro: false };
  let keepAliveTimer = null;
  let sessionPromptTimer = null;
  let badge = null;

  const ID_HINT = /user\s*id|pan|aadhaar|login\s*id|username/i;
  const SESSION_HINT = /session/i;
  const CONTINUE_HINT = /^(continue|stay|yes|extend|keep me|ok)/i;

  function send(msg) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(msg, (res) => resolve(chrome.runtime.lastError ? null : res));
      } catch { resolve(null); }
    });
  }

  async function init() {
    const res = await send({ type: 'portal:getState' });
    if (res) state = res;
    renderBadge();
    maybeAutofill();
    setupKeepAlive();
  }

  // ---- Badge --------------------------------------------------------------
  function renderBadge() {
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'itr-desk-badge';
      document.documentElement.appendChild(badge);
    }
    const c = state.client;
    badge.innerHTML = '';
    const label = document.createElement('span');
    label.className = 'itr-desk-label';
    label.textContent = c ? `${c.name} · ${c.pan}` : 'No active client';
    badge.appendChild(label);

    if (c) {
      const fill = button('Fill User ID', () => fillUserId(true));
      badge.appendChild(fill);
      const copy = button('Copy PAN', async () => {
        try { await navigator.clipboard.writeText(c.pan); flash(copy, 'Copied'); } catch { flash(copy, 'Blocked'); }
      });
      badge.appendChild(copy);
    }
    const open = button(c ? 'Switch' : 'Pick client', () => send({ type: 'portal:openSidePanel' }));
    badge.appendChild(open);
  }

  function button(text, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = text;
    b.addEventListener('click', onClick);
    return b;
  }

  function flash(el, text) {
    const prev = el.textContent;
    el.textContent = text;
    setTimeout(() => (el.textContent = prev), 1200);
  }

  // ---- Autofill -------------------------------------------------------------
  // Verified against the live login page (Oct 2026): the field is
  // <input id="panAdhaarUserId" placeholder="PAN/ Aadhaar/ Other User ID" maxlength="16">
  const KNOWN_SELECTORS = ['#panAdhaarUserId', 'input[name="panAdhaarUserId"]'];

  function findUserIdInput() {
    const custom = state.settings?.customUserIdSelector;
    if (custom) {
      const el = document.querySelector(custom);
      if (el) return el;
    }
    for (const sel of KNOWN_SELECTORS) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    const inputs = [...document.querySelectorAll('input')].filter((i) => {
      const type = (i.getAttribute('type') || 'text').toLowerCase();
      if (!['text', 'search', 'tel', ''].includes(type)) return false;
      const r = i.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    });
    for (const i of inputs) {
      const hints = [
        i.placeholder, i.getAttribute('aria-label'), i.name, i.id,
        i.labels && [...i.labels].map((l) => l.textContent).join(' '),
        i.closest('mat-form-field, .form-group, label')?.textContent
      ].filter(Boolean).join(' ');
      if (ID_HINT.test(hints)) return i;
    }
    return null;
  }

  function setNativeValue(el, value) {
    const proto = Object.getPrototypeOf(el);
    const desc = Object.getOwnPropertyDescriptor(proto, 'value');
    if (desc?.set) desc.set.call(el, value); else el.value = value;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  }

  function fillUserId(manual = false) {
    const c = state.client;
    if (!c?.pan) return false;
    const el = findUserIdInput();
    if (!el) {
      if (manual) flashBadge('No User ID field on this page');
      return false;
    }
    if (!manual && el.value) return false; // don't clobber something the user typed
    el.focus();
    setNativeValue(el, c.pan.toUpperCase());
    flashBadge(`Filled ${c.pan}`);
    return true;
  }

  function flashBadge(text) {
    if (!badge) return;
    const l = badge.querySelector('.itr-desk-label');
    const prev = l.textContent;
    l.textContent = text;
    setTimeout(() => (l.textContent = prev), 1800);
  }

  let autofillTries = 0;
  function maybeAutofill() {
    if (!state.settings?.autofillOnLogin || !state.client) return;
    if (!/login/i.test(location.pathname + location.hash)) return;
    if (fillUserId(false) || autofillTries++ > 10) return;
    setTimeout(maybeAutofill, 800); // Angular renders late
  }

  // ---- Keep-alive -------------------------------------------------------------
  function setupKeepAlive() {
    if (keepAliveTimer) clearInterval(keepAliveTimer);
    if (sessionPromptTimer) clearInterval(sessionPromptTimer);
    keepAliveTimer = sessionPromptTimer = null;
    if (!state.settings?.keepAlive) return;
    const every = Math.max(1, Number(state.settings.keepAliveMinutes) || 4) * 60 * 1000;
    keepAliveTimer = setInterval(tick, every);
    // Watch for the expiry dialog more often than the activity ping.
    sessionPromptTimer = setInterval(dismissSessionPrompt, 15 * 1000);
  }

  function tick() {
    if (document.hidden && !state.settings?.keepAlive) return;
    const x = 5 + Math.random() * 20, y = 5 + Math.random() * 20;
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: x, clientY: y }));
    document.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Shift' }));
    document.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'Shift' }));
    window.dispatchEvent(new Event('scroll'));
    dismissSessionPrompt();
  }

  function dismissSessionPrompt() {
    const dialogs = document.querySelectorAll('[role="dialog"], .modal, mat-dialog-container, .cdk-overlay-container');
    for (const d of dialogs) {
      if (!SESSION_HINT.test(d.textContent || '')) continue;
      const btn = [...d.querySelectorAll('button, a')].find((b) => CONTINUE_HINT.test((b.textContent || '').trim()));
      if (btn) { btn.click(); return true; }
    }
    return false;
  }

  // ---- Live updates ---------------------------------------------------------
  chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.type === 'portal:activeClient') {
      state.client = msg.client;
      renderBadge();
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.settings) {
      state.settings = { ...state.settings, ...changes.settings.newValue };
      setupKeepAlive();
    }
  });

  // Angular SPA: re-run autofill on route changes.
  let lastHref = location.href;
  setInterval(() => {
    if (location.href !== lastHref) { lastHref = location.href; autofillTries = 0; maybeAutofill(); }
  }, 1000);

  init();
})();
