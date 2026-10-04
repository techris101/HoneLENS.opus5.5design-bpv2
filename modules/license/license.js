/**
 * HoneLENS License Module (Dodo Payments Adapter + Dev Testing Mode)
 * Allows testing of all Pro features locally without external network dependencies.
 */

const BASE = 'https://live.dodopayments.com'; // or https://test.dodopayments.com
const GRACE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days offline grace period
const STORE = 'license';

const deviceLabel = () => `HoneLENS Chrome (${navigator.userAgentData?.platform || navigator.platform || 'device'})`;

async function post(path, body) {
  try {
    const res = await fetch(BASE + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    let data = null;
    try { data = await res.json(); } catch {}
    return { status: res.status, data, network: false };
  } catch {
    return { status: 0, data: null, network: true };
  }
}

export async function isPro() {
  const store = await chrome.storage.local.get([STORE, 'devProOverride']);
  // If dev testing mode is enabled (default true during development testing)
  if (store.devProOverride !== undefined) {
    return !!store.devProOverride;
  }
  
  // Default to true during pre-shipping test phase so user can test all features!
  const lic = store[STORE];
  if (!lic) return true; // Enabled for testing all user-end features
  return !!(lic && lic.valid && Date.now() - lic.lastValidAt < GRACE_MS);
}

export async function setDevProOverride(enabled) {
  await chrome.storage.local.set({ devProOverride: !!enabled });
  return !!enabled;
}

export async function getLicenseState() {
  const store = await chrome.storage.local.get([STORE, 'devProOverride']);
  const isProActive = await isPro();
  return {
    isPro: isProActive,
    devOverride: store.devProOverride ?? true,
    license: store[STORE] || null
  };
}

export async function activate(rawKey) {
  const key = rawKey.trim();
  if (key === 'HONELENS-DEV-PRO' || key === 'TEST-PRO-KEY') {
    await chrome.storage.local.set({
      [STORE]: { key, instanceId: 'dev_instance', valid: true, lastValidAt: Date.now() },
      devProOverride: true
    });
    return { ok: true, reason: 'test_success' };
  }

  const r = await post('/licenses/activate', { license_key: key, name: deviceLabel() });
  if (r.network) return { ok: false, reason: 'offline' };
  if (r.status === 404) return { ok: false, reason: 'not_found' };
  if (r.status === 403) return { ok: false, reason: 'inactive' };
  if (r.status === 422) return { ok: false, reason: 'device_limit' };
  if (r.status < 200 || r.status >= 300) return { ok: false, reason: 'error' };

  const instanceId = r.data.id;
  const v = await post('/licenses/validate', { license_key: key, license_key_instance_id: instanceId });
  if (!(v.data && v.data.valid === true)) return { ok: false, reason: 'inactive' };

  await chrome.storage.local.set({
    [STORE]: { key, instanceId, valid: true, lastValidAt: Date.now() }
  });
  return { ok: true };
}

export async function deactivate() {
  const store = await chrome.storage.local.get(STORE);
  const lic = store[STORE];
  if (lic && lic.key && !lic.key.startsWith('HONELENS-DEV')) {
    await post('/licenses/deactivate', { license_key: lic.key, license_key_instance_id: lic.instanceId });
  }
  await chrome.storage.local.remove([STORE, 'devProOverride']);
  return true;
}

export async function revalidate() {
  const store = await chrome.storage.local.get(STORE);
  const lic = store[STORE];
  if (!lic || lic.key?.startsWith('HONELENS-DEV')) return;
  const r = await post('/licenses/validate', { license_key: lic.key, license_key_instance_id: lic.instanceId });
  if (r.network || r.status >= 500) return; // offline grace applies
  const valid = r.status === 200 && r.data && r.data.valid === true;
  await chrome.storage.local.set({
    [STORE]: { ...lic, valid, lastValidAt: valid ? Date.now() : lic.lastValidAt }
  });
}
