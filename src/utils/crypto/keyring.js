// Module-level singleton holding the unlocked DEK and crypto status, so the
// plain-function API layer (src/utils/api/*) can encrypt/decrypt without hooks.
// CryptoProvider drives the state; rowCodec awaits getDEK().
//
// Statuses:
//   'loading'  — session/key state not resolved yet; getDEK() callers wait
//   'off'      — user has no encryption keys; codec passes through
//   'unlocked' — DEK available
//   'locked'   — user has keys but no DEK this session (restored session /
//                password changed elsewhere); reads show placeholders,
//                encrypted-field mutations must fail loudly

let dek = null;
let macKey = null; // derived HMAC key for deterministic-IV fields (categories.name)
let status = 'loading';
let waiters = [];
let listeners = new Set();

function settle() {
  const w = waiters;
  waiters = [];
  w.forEach((resolve) => resolve());
}

function notify() {
  listeners.forEach((fn) => fn(status));
}

export function getStatus() {
  return status;
}

// Resolves once status is no longer 'loading'. Returns the DEK CryptoKey when
// unlocked, null when 'off' or 'locked' — callers that must not proceed
// without a key check getStatus() === 'locked' themselves (see rowCodec).
export async function getDEK() {
  if (status === 'loading') {
    await new Promise((resolve) => waiters.push(resolve));
  }
  return dek;
}

// Derived HMAC key for deterministic-IV fields. Resolves after loading like
// getDEK; null when 'off'/'locked' or when no macKey was provided (older
// cached sessions before the deterministic-fields feature — callers fall back
// to leaving the value plaintext, which reads/writes remain tolerant of).
export async function getMacKey() {
  if (status === 'loading') {
    await new Promise((resolve) => waiters.push(resolve));
  }
  return macKey;
}

export function setUnlocked(cryptoKey, derivedMacKey = null) {
  dek = cryptoKey;
  macKey = derivedMacKey;
  status = 'unlocked';
  settle();
  notify();
}

export function setOff() {
  dek = null;
  macKey = null;
  status = 'off';
  settle();
  notify();
}

export function setLocked() {
  dek = null;
  macKey = null;
  status = 'locked';
  settle();
  notify();
}

export function clear() {
  dek = null;
  macKey = null;
  status = 'loading';
  notify();
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
