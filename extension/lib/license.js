// Dodo Payments license keys.
// Both endpoints below are public (no API key) per Dodo's docs:
//   POST {base}/licenses/activate  { license_key, name }           -> 201 { id: "lki_...", ... }
//   POST {base}/licenses/validate  { license_key, license_key_instance_id } -> 200 { valid: boolean }

import { getLicense, saveLicense } from './storage.js';

export const DODO_BASE = 'https://live.dodopayments.com';
const REVALIDATE_EVERY_MS = 7 * 24 * 60 * 60 * 1000;   // re-check weekly
const GRACE_MS = 14 * 24 * 60 * 60 * 1000;             // keep Pro on for 14 days if offline

function instanceName() {
  const ua = navigator.userAgent || '';
  const os = /Windows/.test(ua) ? 'Windows' : /Mac/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'Browser';
  return `ITR Desk on ${os}`;
}

export async function activate(licenseKey) {
  const key = String(licenseKey || '').trim();
  if (!key) throw new Error('Enter a licence key.');
  let res;
  try {
    res = await fetch(`${DODO_BASE}/licenses/activate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ license_key: key, name: instanceName() })
    });
  } catch {
    throw new Error('Could not reach the licence server. Check your connection and try again.');
  }
  if (!res.ok) {
    const text = await safeText(res);
    throw new Error(res.status === 404 || res.status === 400
      ? 'That licence key was not recognised. Check for typos or contact support.'
      : `Activation failed (${res.status}). ${text}`.trim());
  }
  const data = await res.json();
  const license = {
    key,
    instanceId: data.id,
    product: data.product?.name || 'ITR Desk Pro',
    email: data.customer?.email || '',
    activatedAt: Date.now(),
    lastCheck: Date.now(),
    valid: true
  };
  await saveLicense(license);
  return license;
}

export async function validate({ force = false } = {}) {
  const license = await getLicense();
  if (!license?.key) return { pro: false, reason: 'none' };
  const stale = Date.now() - (license.lastCheck || 0) > REVALIDATE_EVERY_MS;
  if (!force && !stale) return { pro: !!license.valid, license };
  try {
    const res = await fetch(`${DODO_BASE}/licenses/validate`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ license_key: license.key, license_key_instance_id: license.instanceId || null })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const next = { ...license, valid: !!data.valid, lastCheck: Date.now() };
    await saveLicense(next);
    return { pro: next.valid, license: next };
  } catch (err) {
    // Offline or Dodo hiccup: honour the last known state within the grace window.
    const withinGrace = Date.now() - (license.lastCheck || 0) < GRACE_MS;
    return { pro: !!license.valid && withinGrace, license, offline: true };
  }
}

export async function deactivateLocal() {
  await saveLicense(null);
}

async function safeText(res) {
  try { return (await res.text()).slice(0, 200); } catch { return ''; }
}
