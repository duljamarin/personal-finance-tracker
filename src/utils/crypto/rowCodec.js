import {
  encryptField,
  encryptFieldDeterministic,
  decryptField,
  isEncrypted,
  LOCKED_PLACEHOLDER,
} from './cipher';
import {
  FIELD_MAP,
  NESTED_RELATIONS,
  isNumericField,
  isJsonField,
  isDeterministicField,
} from './fieldMap';
import { getDEK, getMacKey, getStatus } from './keyring';

// Coerce a decrypted/plaintext value back to a number. Tolerates the locked
// placeholder (returns null so the UI shows an empty amount rather than NaN)
// and already-numeric values. Arrays are coerced element-wise.
function coerceNumeric(value) {
  if (Array.isArray(value)) return value.map(coerceNumeric);
  if (value === null || value === undefined) return value;
  if (value === LOCKED_PLACEHOLDER) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}

// Parse a decrypted JSON field back into its object/array value. Tolerates:
//  - the locked placeholder (returns null — UI hides insights when locked)
//  - already-parsed values (pre-migration plaintext jsonb comes back as an
//    object/array, never a string — pass through untouched)
//  - malformed JSON (returns null rather than throwing on one bad row)
function coerceJson(value) {
  if (value === null || value === undefined) return value;
  if (value === LOCKED_PLACEHOLDER) return null;
  if (typeof value !== 'string') return value; // plaintext jsonb already parsed
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

async function encryptValue(dek, value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => encryptField(dek, v)));
  }
  return encryptField(dek, value);
}

async function decryptValue(dek, value) {
  if (Array.isArray(value)) {
    return Promise.all(value.map((v) => decryptField(dek, v)));
  }
  return decryptField(dek, value);
}

// Encrypts the in-scope fields of a write payload in place (returns a new
// object). No-op when the user has no encryption keys ('off'). Throws when
// the user has keys but the session is locked — mutations must never write
// plaintext silently for an encryption-enabled user.
// Serialize JSON fields to a string up front. Their DB columns are `text`, so
// even with encryption OFF the value must be a JSON string (not a raw
// object/array) or the write into a text column fails. NULL stays NULL.
function stringifyJsonFields(table, payload) {
  const fields = FIELD_MAP[table];
  let out = payload;
  for (const field of fields) {
    if (!isJsonField(table, field)) continue;
    if (out[field] === undefined || out[field] === null) continue;
    if (typeof out[field] === 'string') continue; // already serialized
    if (out === payload) out = { ...payload };
    out[field] = JSON.stringify(out[field]);
  }
  return out;
}

export async function encryptRow(table, payload) {
  const fields = FIELD_MAP[table];
  if (!fields || !payload) return payload;

  // Normalize JSON fields to strings regardless of encryption status (text
  // columns can't take raw objects).
  const normalized = stringifyJsonFields(table, payload);

  const status = getStatus();
  if (status === 'off') return normalized;
  if (status === 'locked') {
    throw new Error('Your data is locked. Please unlock encryption before saving.');
  }

  const dek = await getDEK();
  if (!dek) return normalized; // resolved to 'off' after loading
  const macKey = await getMacKey();

  const out = { ...normalized };
  for (const field of fields) {
    if (out[field] === undefined || out[field] === null) continue;
    // Deterministic fields (categories.name) need equality-preserving
    // ciphertext. Falls back to plaintext when macKey is missing (a session
    // cached before this feature) — decrypt tolerates the mix.
    if (isDeterministicField(table, field)) {
      out[field] = macKey
        ? await encryptFieldDeterministic(dek, macKey, out[field])
        : out[field];
      continue;
    }
    out[field] = await encryptValue(dek, out[field]);
  }
  return out;
}

// Compute the deterministic ciphertext for a single value (e.g. to match a
// category name in an equality lookup). Returns the plaintext unchanged when
// encryption is off/locked/unavailable so callers can query either form.
export async function deterministicCiphertext(table, field, value) {
  if (value === null || value === undefined || value === '') return value;
  if (!isDeterministicField(table, field)) return value;
  if (getStatus() !== 'unlocked') return value;
  const dek = await getDEK();
  const macKey = await getMacKey();
  if (!dek || !macKey) return value;
  return encryptFieldDeterministic(dek, macKey, value);
}

async function decryptPlainRow(table, row, dek) {
  const fields = FIELD_MAP[table];
  if (!fields || !row) return row;
  const out = { ...row };
  for (const field of fields) {
    if (out[field] === undefined || out[field] === null) continue;
    // JSON fields are a single ciphertext string (or, pre-migration, an
    // already-parsed jsonb value). Decrypt the scalar, then parse back to the
    // object/array — never element-wise like decryptValue does for arrays.
    if (isJsonField(table, field)) {
      const decrypted = isEncrypted(out[field])
        ? await decryptField(dek, out[field])
        : out[field];
      out[field] = coerceJson(decrypted);
      continue;
    }
    out[field] = await decryptValue(dek, out[field]);
    // Numeric fields are stored as text (encrypted or plaintext-numeric-string)
    // and must round-trip back to Number for the UI/aggregation layers.
    if (isNumericField(table, field)) {
      out[field] = coerceNumeric(out[field]);
    }
  }
  const nested = NESTED_RELATIONS[table];
  if (nested) {
    for (const rel of nested) {
      const value = out[rel.key];
      if (Array.isArray(value)) {
        out[rel.key] = await Promise.all(
          value.map((r) => decryptPlainRow(rel.table, r, dek))
        );
      } else if (rel.single && value && typeof value === 'object') {
        // Embedded single-object relation (e.g. category:categories(id, name))
        // whose fields are encrypted on their own table — decrypt in place so
        // every join call site gets plaintext without extra work.
        out[rel.key] = await decryptPlainRow(rel.table, value, dek);
      }
    }
  }
  return out;
}

// Tolerant of plaintext (pass-through) and locked sessions (placeholder via
// decryptField). Safe to call unconditionally on every read path.
export async function decryptRow(table, row) {
  if (!row) return row;
  const dek = await getDEK();
  return decryptPlainRow(table, row, dek);
}

export async function decryptRows(table, rows) {
  if (!rows || !rows.length) return rows || [];
  const dek = await getDEK();
  return Promise.all(rows.map((row) => decryptPlainRow(table, row, dek)));
}

export { isEncrypted };
