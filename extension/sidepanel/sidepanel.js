import * as store from '../lib/storage.js';
import * as license from '../lib/license.js';
import { FREE_CLIENT_LIMIT, PRICING, canAddClient } from '../lib/limits.js';
import { upcoming, formatDate } from '../lib/duedates.js';

const $ = (sel) => document.querySelector(sel);
const PAN_RE = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const PORTAL_URL = 'https://eportal.incometax.gov.in/iec/foservices/#/login';

let state = { clients: [], activeId: null, settings: null, pro: false, notices: [] };

// ---- boot -------------------------------------------------------------------
async function boot() {
  $('#ver').textContent = chrome.runtime.getManifest().version;
  await refresh();
  wireTabs();
  wireClients();
  wireNotices();
  wireSettings();
  wireLicense();
  renderDueDates();
}

async function refresh() {
  const [clients, activeId, settings, lic, notices] = await Promise.all([
    store.getClients(), store.getActiveClientId(), store.getSettings(), license.validate(), store.getNotices()
  ]);
  state = { ...state, clients, activeId, settings, pro: lic.pro, license: lic.license, notices };
  renderPlan();
  renderActive();
  renderClients();
  renderNotices();
  renderSettings();
  renderLicense();
}

// ---- tabs -------------------------------------------------------------------
function wireTabs() {
  document.querySelectorAll('.tab').forEach((t) => t.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach((x) => x.classList.toggle('is-active', x === t));
    document.querySelectorAll('.panel').forEach((p) => p.classList.toggle('is-active', p.id === `tab-${t.dataset.tab}`));
  }));
  document.querySelectorAll('#upgradeBtn, .upgrade-link').forEach((b) => b.addEventListener('click', () => {
    chrome.tabs.create({ url: PRICING.checkoutUrl });
  }));
}

// ---- plan -------------------------------------------------------------------
function renderPlan() {
  const b = $('#planBadge');
  b.textContent = state.pro ? 'Pro' : 'Free';
  b.classList.toggle('pro', state.pro);
  $('#upgradeBtn').classList.toggle('hidden', state.pro);
  $('#noticesLocked').classList.toggle('hidden', state.pro);
  $('#noticesBody').classList.toggle('hidden', !state.pro);
}

// ---- clients ----------------------------------------------------------------
function activeClient() {
  return state.clients.find((c) => c.id === state.activeId) || null;
}

function renderActive() {
  const c = activeClient();
  $('#activeName').textContent = c ? c.name : 'None selected';
  $('#activePan').textContent = c ? c.pan : 'Pick a client below, then open the portal.';
  $('#copyPanBtn').disabled = !c;
}

function renderClients() {
  const q = ($('#search').value || '').trim().toLowerCase();
  const list = $('#clientList');
  list.innerHTML = '';
  const items = state.clients
    .filter((c) => !q || [c.name, c.pan, ...(c.tags || [])].join(' ').toLowerCase().includes(q))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (!items.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = state.clients.length ? 'No matches.' : 'No clients yet. Add your first one.';
    list.appendChild(li);
  }
  for (const c of items) {
    const li = document.createElement('li');
    li.classList.toggle('is-active', c.id === state.activeId);
    li.innerHTML = `
      <div class="grow">
        <div class="title"></div>
        <div class="sub"><span class="mono pan"></span> <span class="tags"></span></div>
      </div>
      <button class="icon-btn" data-act="edit" title="Edit">Edit</button>
      <button class="icon-btn" data-act="del" title="Delete">✕</button>`;
    li.querySelector('.title').textContent = c.name;
    li.querySelector('.pan').textContent = c.pan;
    const tags = li.querySelector('.tags');
    (c.tags || []).forEach((t) => { const s = document.createElement('span'); s.className = 'tag'; s.textContent = t; tags.appendChild(s); });
    li.querySelector('.grow').addEventListener('click', () => setActive(c.id));
    li.querySelector('[data-act="edit"]').addEventListener('click', () => openForm(c));
    li.querySelector('[data-act="del"]').addEventListener('click', async () => {
      if (!confirm(`Delete ${c.name}?`)) return;
      state.clients = await store.deleteClient(c.id);
      state.activeId = await store.getActiveClientId();
      renderActive(); renderClients(); toast('Deleted');
    });
    list.appendChild(li);
  }

  const note = $('#limitNote');
  if (!state.pro && state.clients.length >= FREE_CLIENT_LIMIT) {
    note.textContent = `Free plan holds ${FREE_CLIENT_LIMIT} clients. Pro removes the limit (${PRICING.inr.label}).`;
    note.classList.remove('hidden');
  } else note.classList.add('hidden');
}

async function setActive(id) {
  state.activeId = id;
  await store.setActiveClientId(id);
  renderActive(); renderClients();
}

function openForm(c) {
  const f = $('#clientForm');
  $('#formTitle').textContent = c ? 'Edit client' : 'Add client';
  $('#f-id').value = c?.id || '';
  $('#f-name').value = c?.name || '';
  $('#f-pan').value = c?.pan || '';
  $('#f-dob').value = c?.dob || '';
  $('#f-tags').value = (c?.tags || []).join(', ');
  $('#f-notes').value = c?.notes || '';
  $('#f-tags').disabled = !state.pro;
  $('#f-tags').placeholder = state.pro ? 'audit, salaried, nri' : 'Tags are a Pro feature';
  f.classList.remove('hidden');
  $('#f-name').focus();
}

function wireClients() {
  $('#search').addEventListener('input', renderClients);
  $('#addBtn').addEventListener('click', () => {
    if (!canAddClient(state.clients.length, state.pro)) {
      toast(`Free plan limit reached (${FREE_CLIENT_LIMIT}). Upgrade for unlimited clients.`);
      return;
    }
    openForm(null);
  });
  $('#cancelBtn').addEventListener('click', () => $('#clientForm').classList.add('hidden'));
  $('#clientForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const pan = $('#f-pan').value.trim().toUpperCase();
    if (!PAN_RE.test(pan)) { toast('PAN must look like ABCDE1234F'); return; }
    const id = $('#f-id').value || undefined;
    if (!id && !canAddClient(state.clients.length, state.pro)) { toast('Free plan limit reached.'); return; }
    const dupe = state.clients.find((c) => c.pan === pan && c.id !== id);
    if (dupe) { toast(`PAN already saved for ${dupe.name}`); return; }
    const client = {
      id, name: $('#f-name').value.trim(), pan,
      dob: $('#f-dob').value || '',
      tags: state.pro ? $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean) : [],
      notes: $('#f-notes').value.trim()
    };
    state.clients = await store.upsertClient(client);
    if (!id) {
      const created = state.clients.find((c) => c.pan === pan);
      if (created && !state.activeId) await setActive(created.id);
    }
    $('#clientForm').classList.add('hidden');
    renderClients(); renderActive(); renderNoticeClientOptions();
    toast('Saved');
  });
  $('#copyPanBtn').addEventListener('click', async () => {
    const c = activeClient(); if (!c) return;
    await navigator.clipboard.writeText(c.pan); toast('PAN copied');
  });
  $('#openPortalBtn').addEventListener('click', () => chrome.tabs.create({ url: PORTAL_URL }));

  $('#exportCsvBtn').addEventListener('click', () => {
    if (!state.pro) return toast('CSV export is a Pro feature.');
    const rows = [['name', 'pan', 'dob', 'tags', 'notes'], ...state.clients.map((c) => [c.name, c.pan, c.dob || '', (c.tags || []).join('|'), c.notes || ''])];
    const csv = rows.map((r) => r.map(csvCell).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    chrome.downloads.download({ url, filename: 'itr-desk-clients.csv', saveAs: true });
  });
  $('#importCsv').addEventListener('change', async (e) => {
    const file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    if (!state.pro) return toast('CSV import is a Pro feature.');
    const text = await file.text();
    const rows = parseCsv(text);
    const header = rows.shift().map((h) => h.trim().toLowerCase());
    const col = (name) => header.indexOf(name);
    let added = 0, skipped = 0;
    for (const r of rows) {
      const pan = (r[col('pan')] || '').trim().toUpperCase();
      const name = (r[col('name')] || '').trim();
      if (!PAN_RE.test(pan) || !name || state.clients.some((c) => c.pan === pan)) { skipped++; continue; }
      state.clients = await store.upsertClient({
        name, pan, dob: r[col('dob')] || '',
        tags: (r[col('tags')] || '').split('|').map((t) => t.trim()).filter(Boolean),
        notes: r[col('notes')] || ''
      });
      added++;
    }
    renderClients(); renderNoticeClientOptions();
    toast(`Imported ${added}, skipped ${skipped}`);
  });
}

function csvCell(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function parseCsv(text) {
  const rows = []; let row = []; let cell = ''; let q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cell); cell = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += ch;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

// ---- due dates --------------------------------------------------------------
async function renderDueDates() {
  const items = await upcoming(8);
  const list = $('#dueList');
  list.innerHTML = '';
  for (const i of items) {
    const li = document.createElement('li');
    li.className = 'due' + (i.daysLeft <= 0 ? ' today' : i.daysLeft <= 7 ? ' soon' : '');
    li.innerHTML = `<div class="grow"><div class="title"></div><div class="sub"></div></div><div class="days"></div>`;
    li.querySelector('.title').textContent = i.label;
    li.querySelector('.sub').textContent = formatDate(i.date) + (i.note ? ` · ${i.note}` : '');
    li.querySelector('.days').textContent = i.daysLeft <= 0 ? 'Today' : `${i.daysLeft}d`;
    list.appendChild(li);
  }
}

// ---- notices (Pro) ----------------------------------------------------------
function renderNoticeClientOptions() {
  const sel = $('#n-client');
  sel.innerHTML = '';
  for (const c of [...state.clients].sort((a, b) => a.name.localeCompare(b.name))) {
    const o = document.createElement('option');
    o.value = c.id; o.textContent = `${c.name} (${c.pan})`;
    sel.appendChild(o);
  }
}

function renderNotices() {
  renderNoticeClientOptions();
  const list = $('#noticeList');
  list.innerHTML = '';
  const open = [...state.notices].sort((a, b) => (a.status === 'closed') - (b.status === 'closed') || a.due.localeCompare(b.due));
  if (!open.length) {
    const li = document.createElement('li'); li.className = 'muted'; li.textContent = 'No notices logged.'; list.appendChild(li);
  }
  const today = new Date().toISOString().slice(0, 10);
  for (const n of open) {
    const c = state.clients.find((x) => x.id === n.clientId);
    const li = document.createElement('li');
    const overdue = n.status === 'open' && n.due < today;
    li.className = 'due' + (overdue ? ' today' : n.status === 'open' ? ' soon' : '');
    li.innerHTML = `<div class="grow"><div class="title"></div><div class="sub"></div></div>
      <button class="icon-btn" data-act="edit">Edit</button><button class="icon-btn" data-act="del">✕</button>`;
    li.querySelector('.title').textContent = `${c ? c.name : 'Unknown client'} · ${n.type}`;
    li.querySelector('.sub').textContent = `Due ${n.due} · ${n.status}${n.din ? ' · DIN ' + n.din : ''}`;
    li.querySelector('[data-act="edit"]').addEventListener('click', () => openNoticeForm(n));
    li.querySelector('[data-act="del"]').addEventListener('click', async () => {
      state.notices = state.notices.filter((x) => x.id !== n.id);
      await store.saveNotices(state.notices); renderNotices();
    });
    list.appendChild(li);
  }
}

function openNoticeForm(n) {
  $('#n-id').value = n?.id || '';
  if (n) $('#n-client').value = n.clientId; else if (state.activeId) $('#n-client').value = state.activeId;
  $('#n-type').value = n?.type || '';
  $('#n-din').value = n?.din || '';
  $('#n-due').value = n?.due || '';
  $('#n-status').value = n?.status || 'open';
  $('#n-notes').value = n?.notes || '';
  $('#noticeForm').classList.remove('hidden');
}

function wireNotices() {
  $('#addNoticeBtn').addEventListener('click', () => {
    if (!state.clients.length) return toast('Add a client first.');
    openNoticeForm(null);
  });
  $('#cancelNoticeBtn').addEventListener('click', () => $('#noticeForm').classList.add('hidden'));
  $('#noticeForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = $('#n-id').value || store.cryptoId();
    const notice = {
      id, clientId: $('#n-client').value, type: $('#n-type').value.trim(), din: $('#n-din').value.trim(),
      due: $('#n-due').value, status: $('#n-status').value, notes: $('#n-notes').value.trim(), updatedAt: Date.now()
    };
    const idx = state.notices.findIndex((x) => x.id === id);
    if (idx === -1) state.notices.push(notice); else state.notices[idx] = notice;
    await store.saveNotices(state.notices);
    $('#noticeForm').classList.add('hidden');
    renderNotices(); toast('Saved');
  });
}

// ---- settings ---------------------------------------------------------------
const SETTING_IDS = ['keepAlive', 'keepAliveMinutes', 'autofillOnLogin', 'customUserIdSelector', 'organiseDownloads', 'downloadRoot'];

function renderSettings() {
  for (const k of SETTING_IDS) {
    const el = $(`#s-${k}`);
    if (el.type === 'checkbox') el.checked = !!state.settings[k]; else el.value = state.settings[k] ?? '';
  }
}

function wireSettings() {
  for (const k of SETTING_IDS) {
    $(`#s-${k}`).addEventListener('change', async (e) => {
      const el = e.target;
      const v = el.type === 'checkbox' ? el.checked : el.type === 'number' ? Number(el.value) : el.value.trim();
      state.settings = await store.saveSettings({ [k]: v });
      toast('Saved');
    });
  }
  $('#wipeBtn').addEventListener('click', async () => {
    if (!confirm('Delete all clients, notices and settings stored by ITR Desk in this browser?')) return;
    await chrome.storage.local.clear();
    await refresh(); toast('Local data deleted');
  });
}

// ---- licence ----------------------------------------------------------------
function renderLicense() {
  const l = state.license;
  const s = $('#licenseStatus');
  if (state.pro) s.textContent = `Pro active${l?.email ? ' · ' + l.email : ''} · last checked ${new Date(l.lastCheck).toLocaleDateString('en-IN')}`;
  else if (l?.key) s.textContent = 'Key saved but not valid right now. Re-check or contact support.';
  else s.textContent = `Free plan · Pro is ${PRICING.inr.label} (${PRICING.usd.label} outside India).`;
}

function wireLicense() {
  $('#activateBtn').addEventListener('click', async () => {
    const key = $('#licenseKey').value.trim();
    const msg = $('#licenseMsg');
    msg.classList.remove('hidden', 'ok');
    msg.textContent = 'Activating…';
    try {
      await license.activate(key);
      await refresh();
      msg.textContent = 'Pro activated on this browser. Thank you!';
      msg.classList.add('ok');
      $('#licenseKey').value = '';
    } catch (e) {
      msg.textContent = e.message;
    }
  });
  $('#recheckBtn').addEventListener('click', async () => { await license.validate({ force: true }); await refresh(); toast('Checked'); });
  $('#removeLicenseBtn').addEventListener('click', async () => {
    if (!confirm('Remove the licence key from this browser?')) return;
    await license.deactivateLocal(); await refresh(); toast('Key removed');
  });
}

// ---- misc -------------------------------------------------------------------
let toastTimer;
function toast(text) {
  const t = $('#toast');
  t.textContent = text; t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 1800);
}

boot();
