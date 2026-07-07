// WebCrypto primitives for E2E field encryption. No app imports — pure functions.
// Ciphertext format: 'enc:v1:<base64 iv>:<base64 ct>' — self-describing so readers
// tolerate mixed plaintext/ciphertext during migration and after reversal.

export const ENC_PREFIX = 'enc:v1:';
export const PBKDF2_ITERATIONS = 600000;
// Sentinel returned when a value is encrypted but cannot be decrypted
// (keyring locked, or key lost after a recovery-code reset).
export const LOCKED_PLACEHOLDER = 'locked';

export function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

const te = new TextEncoder();
const td = new TextDecoder();

function toBase64(bytes) {
  let bin = '';
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i += 0x8000) {
    bin += String.fromCharCode.apply(null, arr.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

function fromBase64(b64) {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function generateSalt() {
  return toBase64(crypto.getRandomValues(new Uint8Array(16)));
}

export function generateRawDEK() {
  return crypto.getRandomValues(new Uint8Array(32));
}

// Derive a key-encryption-key from a secret (password or recovery code).
// Used only to wrap/unwrap the raw DEK, never to encrypt data directly.
export async function deriveKEK(secret, saltB64, iterations = PBKDF2_ITERATIONS) {
  const baseKey = await crypto.subtle.importKey(
    'raw', te.encode(secret), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: fromBase64(saltB64), iterations, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptBytes(key, bytes) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, bytes);
  return ENC_PREFIX + toBase64(iv) + ':' + toBase64(ct);
}

// Deterministic variant: same plaintext -> same ciphertext under the same DEK,
// by deriving the 12-byte IV from HMAC-SHA256(macKey, plaintext) instead of
// random. Needed only for columns with a UNIQUE constraint or an equality dedup
// lookup (categories.name). Slightly weaker than random-IV AES-GCM: it reveals
// which rows share the same plaintext (but not the plaintext itself). Never use
// it for high-entropy secrets — only low-cardinality labels where equality must
// survive encryption.
//
// macKey is a separate HMAC CryptoKey derived from the DEK (see deriveMacKey),
// kept alongside the AES key in the keyring. Both are non-extractable.
async function encryptBytesDeterministic(macKey, aesKey, bytes) {
  const mac = new Uint8Array(await crypto.subtle.sign('HMAC', macKey, bytes));
  const iv = mac.subarray(0, 12); // deterministic IV
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, bytes);
  return ENC_PREFIX + toBase64(iv) + ':' + toBase64(ct);
}

// Derive a stable, non-extractable HMAC key from the raw DEK, domain-separated
// with a fixed label so it is independent of the AES-GCM data key. Called once
// at unlock; the result is cached in the keyring (and IndexedDB) like the AES
// key, so restored sessions get the same deterministic IVs.
export async function deriveMacKey(rawDek) {
  const base = await crypto.subtle.importKey('raw', rawDek, 'HKDF', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    {
      name: 'HKDF',
      hash: 'SHA-256',
      salt: new Uint8Array(0),
      info: te.encode('e2ee-deterministic-iv-v1'),
    },
    base,
    { name: 'HMAC', hash: 'SHA-256', length: 256 },
    false,
    ['sign']
  );
}

// Public deterministic field encryptor. Mirrors encryptField but keyed by both
// the AES data key and the derived MAC key.
export async function encryptFieldDeterministic(aesKey, macKey, str) {
  if (str === null || str === undefined || str === '') return str;
  if (!aesKey || !macKey) return str;
  return encryptBytesDeterministic(macKey, aesKey, te.encode(String(str)));
}

async function decryptBytes(key, wrapped) {
  const parts = wrapped.slice(ENC_PREFIX.length).split(':');
  if (parts.length !== 2) throw new Error('Malformed ciphertext');
  const iv = fromBase64(parts[0]);
  const ct = fromBase64(parts[1]);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new Uint8Array(plain);
}

export async function wrapDEK(rawDek, kek) {
  return encryptBytes(kek, rawDek);
}

// Throws on wrong KEK (GCM auth failure) — callers use this as password verification.
export async function unwrapDEK(wrapped, kek) {
  return decryptBytes(kek, wrapped);
}

// Import raw DEK bytes as a non-extractable key usable for data encryption.
export async function importDEK(rawDek) {
  return crypto.subtle.importKey(
    'raw', rawDek, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']
  );
}

export async function encryptField(dek, str) {
  if (str === null || str === undefined || str === '') return str;
  return encryptBytes(dek, te.encode(String(str)));
}

// Non-encrypted values pass through unchanged (mixed-format tolerance).
// Decryption failure returns LOCKED_PLACEHOLDER instead of throwing so one
// bad row never breaks a whole list fetch.
export async function decryptField(dek, value) {
  if (!isEncrypted(value)) return value;
  if (!dek) return LOCKED_PLACEHOLDER;
  try {
    return td.decode(await decryptBytes(dek, value));
  } catch {
    return LOCKED_PLACEHOLDER;
  }
}
