// Thin wrapper around chrome.storage.local. Everything ITR Desk stores lives
// on the user's machine. No passwords are ever stored — only PAN, name, DOB
// (for autofill) and notes.

const KEYS = {
  clients: 'clients',          // Array<Client>
  activeClientId: 'activeClientId',
  settings: 'settings',
  license: 'license',          // { key, instanceId, validUntil, lastCheck, plan }
  notices: 'notices'           // Array<Notice> (Pro)
};

export const DEFAULT_SETTINGS = {
  keepAlive: true,
  keepAliveMinutes: 4,
  autofillOnLogin: true,
  organiseDownloads: true,
  downloadRoot: 'ITR Desk',
  customUserIdSelector: '',
  showDueDates: true
};

/** @typedef {{id:string,name:string,pan:string,dob?:string,tags?:string[],notes?:string,createdAt:number,updatedAt:number}} Client */

export async function get(key) {
  const out = await chrome.storage.local.get(key);
  return out[key];
}

export async function set(key, value) {
  await chrome.storage.local.set({ [key]: value });
}

export async function getClients() {
  return (await get(KEYS.clients)) || [];
}

export async function saveClients(clients) {
  await set(KEYS.clients, clients);
}

export async function upsertClient(client) {
  const clients = await getClients();
  const now = Date.now();
  const idx = clients.findIndex((c) => c.id === client.id);
  if (idx === -1) {
    clients.push({ ...client, id: client.id || cryptoId(), createdAt: now, updatedAt: now });
  } else {
    clients[idx] = { ...clients[idx], ...client, updatedAt: now };
  }
  await saveClients(clients);
  return clients;
}

export async function deleteClient(id) {
  const clients = (await getClients()).filter((c) => c.id !== id);
  await saveClients(clients);
  const active = await getActiveClientId();
  if (active === id) await setActiveClientId(null);
  return clients;
}

export async function getActiveClientId() {
  return (await get(KEYS.activeClientId)) || null;
}

export async function setActiveClientId(id) {
  await set(KEYS.activeClientId, id);
}

export async function getActiveClient() {
  const id = await getActiveClientId();
  if (!id) return null;
  return (await getClients()).find((c) => c.id === id) || null;
}

export async function getSettings() {
  return { ...DEFAULT_SETTINGS, ...((await get(KEYS.settings)) || {}) };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await set(KEYS.settings, next);
  return next;
}

export async function getLicense() {
  return (await get(KEYS.license)) || null;
}

export async function saveLicense(license) {
  await set(KEYS.license, license);
}

export async function getNotices() {
  return (await get(KEYS.notices)) || [];
}

export async function saveNotices(notices) {
  await set(KEYS.notices, notices);
}

export function cryptoId() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2);
}

export { KEYS };
