// ITR Desk service worker.
// Responsibilities: side-panel wiring, download organiser, licence re-validation,
// and answering state requests from the content script.

import * as store from './lib/storage.js';
import * as license from './lib/license.js';

const PORTAL_HOST = 'eportal.incometax.gov.in';

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  await chrome.alarms.create('revalidate-license', { periodInMinutes: 60 * 24 });
  if (reason === 'install') {
    await store.saveSettings({}); // writes defaults
  }
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'revalidate-license') await license.validate();
});

// ---- Download organiser -------------------------------------------------
// Files downloaded from the e-Filing portal land in
//   <Downloads>/ITR Desk/<Client name> (<PAN>)/[<FY or AY>/]<original name>
// Free: client folder. Pro: also split by AY/FY detected in the filename.

chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
  (async () => {
    try {
      const settings = await store.getSettings();
      if (!settings.organiseDownloads) return suggest();
      const fromPortal = [item.url, item.finalUrl, item.referrer].some((u) => u && u.includes(PORTAL_HOST));
      if (!fromPortal) return suggest();
      const client = await store.getActiveClient();
      if (!client) return suggest();

      const { pro } = await license.validate();
      const root = sanitize(settings.downloadRoot || 'ITR Desk');
      const folder = sanitize(`${client.name} (${client.pan})`);
      const parts = [root, folder];
      if (pro) {
        const ay = detectAssessmentYear(item.filename);
        if (ay) parts.push(ay);
      }
      parts.push(item.filename.split(/[\\/]/).pop());
      suggest({ filename: parts.join('/'), conflictAction: 'uniquify' });
    } catch (e) {
      console.warn('[ITR Desk] organiser skipped:', e);
      suggest();
    }
  })();
  return true; // async suggest
});

function sanitize(s) {
  return String(s).replace(/[<>:"/\\|?*\x00-\x1f]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80);
}

function detectAssessmentYear(name) {
  // Matches 2024-25, 2024-2025, AY2024-25, FY_2023_24 etc.
  const m = String(name).match(/(?:AY|FY)?[\s_-]?(20\d{2})[\s_-]?(?:20)?(\d{2})/i);
  if (!m) return null;
  const start = Number(m[1]);
  const end = Number(m[2]);
  if (end !== (start + 1) % 100) return null;
  const prefix = /FY/i.test(m[0]) ? 'FY' : 'AY';
  return `${prefix} ${start}-${String(end).padStart(2, '0')}`;
}

// ---- Messaging ----------------------------------------------------------

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  (async () => {
    switch (msg?.type) {
      case 'portal:getState': {
        const [client, settings, lic] = await Promise.all([
          store.getActiveClient(), store.getSettings(), license.validate()
        ]);
        sendResponse({ client, settings, pro: lic.pro });
        break;
      }
      case 'license:activate': {
        try {
          const lic = await license.activate(msg.key);
          sendResponse({ ok: true, license: lic });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
        break;
      }
      case 'license:validate': {
        sendResponse(await license.validate({ force: !!msg.force }));
        break;
      }
      case 'license:remove': {
        await license.deactivateLocal();
        sendResponse({ ok: true });
        break;
      }
      case 'portal:openSidePanel': {
        if (sender.tab?.id) await chrome.sidePanel.open({ tabId: sender.tab.id });
        sendResponse({ ok: true });
        break;
      }
      default:
        sendResponse({ error: 'unknown message' });
    }
  })();
  return true;
});

// Let the content script know when the active client changes so the badge updates.
chrome.storage.onChanged.addListener(async (changes, area) => {
  if (area !== 'local' || !(changes.activeClientId || changes.clients)) return;
  const client = await store.getActiveClient();
  const tabs = await chrome.tabs.query({ url: `https://${PORTAL_HOST}/*` });
  for (const t of tabs) {
    chrome.tabs.sendMessage(t.id, { type: 'portal:activeClient', client }).catch(() => {});
  }
});
