// Minimal IndexedDB store for the unlocked (non-extractable) DEK CryptoKey.
// Lets a restored session decrypt without re-entering the password.
// Fails soft: if IndexedDB is unavailable (private browsing), everything
// resolves to null and the user simply unlocks each session.

const DB_NAME = 'pft-e2ee';
const STORE = 'keys';

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('IndexedDB unavailable'));
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx(mode, fn) {
  const db = await openDB();
  try {
    return await new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const req = fn(store);
      t.oncomplete = () => resolve(req ? req.result : undefined);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally {
    db.close();
  }
}

export async function putKey(userId, cryptoKey) {
  try {
    await tx('readwrite', (store) => store.put(cryptoKey, `dek:${userId}`));
    return true;
  } catch {
    return false;
  }
}

export async function getKey(userId) {
  try {
    return (await tx('readonly', (store) => store.get(`dek:${userId}`))) || null;
  } catch {
    return null;
  }
}

export async function clearKeys() {
  try {
    await tx('readwrite', (store) => store.clear());
  } catch {
    // nothing to clear
  }
}
