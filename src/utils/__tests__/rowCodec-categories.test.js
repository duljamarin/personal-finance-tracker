import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  encryptRow,
  decryptRow,
  decryptRows,
  deterministicCiphertext,
} from '../crypto/rowCodec.js';
import { setUnlocked, setOff, clear } from '../crypto/keyring.js';
import {
  generateRawDEK,
  importDEK,
  deriveMacKey,
  isEncrypted,
} from '../crypto/cipher.js';
import { DETERMINISTIC_FIELDS, FIELD_MAP } from '../crypto/fieldMap.js';

async function unlock() {
  const raw = generateRawDEK();
  const key = await importDEK(raw);
  const mac = await deriveMacKey(raw);
  setUnlocked(key, mac);
}

describe('categories field map', () => {
  it('registers name as deterministic and emoji as normal-encrypted', () => {
    expect(DETERMINISTIC_FIELDS.categories).toContain('name');
    expect(FIELD_MAP.categories).toContain('name');
    expect(FIELD_MAP.categories).toContain('emoji');
  });
});

describe('categories round-trip (encryption ON)', () => {
  beforeAll(unlock);
  afterAll(() => clear());

  it('encrypts name + emoji and decrypts them back', async () => {
    const enc = await encryptRow('categories', {
      name: 'Food & Dining',
      emoji: 'Food & Dining',
      user_id: 'u1',
    });
    expect(isEncrypted(enc.name)).toBe(true);
    expect(isEncrypted(enc.emoji)).toBe(true);

    const dec = await decryptRow('categories', enc);
    expect(dec.name).toBe('Food & Dining');
    expect(dec.emoji).toBe('Food & Dining');
  });

  it('encrypts equal names to EQUAL ciphertext (deterministic) so UNIQUE holds', async () => {
    const a = await encryptRow('categories', { name: 'Groceries' });
    const b = await encryptRow('categories', { name: 'Groceries' });
    expect(a.name).toBe(b.name); // deterministic
    expect(isEncrypted(a.name)).toBe(true);
  });

  it('encrypts different names to different ciphertext', async () => {
    const a = await encryptRow('categories', { name: 'Groceries' });
    const b = await encryptRow('categories', { name: 'Rent' });
    expect(a.name).not.toBe(b.name);
  });

  it('emoji uses random IV (equal input -> different ciphertext)', async () => {
    const a = await encryptRow('categories', { emoji: 'Shopping' });
    const b = await encryptRow('categories', { emoji: 'Shopping' });
    expect(a.emoji).not.toBe(b.emoji); // random-IV, not deterministic
  });

  it('deterministicCiphertext() matches the value stored by encryptRow', async () => {
    const enc = await encryptRow('categories', { name: 'Utilities' });
    const needle = await deterministicCiphertext('categories', 'name', 'Utilities');
    expect(needle).toBe(enc.name); // equality lookup would find this row
  });

  it('decrypts an embedded category on a transaction join', async () => {
    // Simulate what a `category:categories(id, name)` join returns: the nested
    // object holds ciphertext that decryptRow must unwrap in place.
    const encCat = await encryptRow('categories', { name: 'Salary', emoji: 'Salary' });
    const txRow = {
      id: 't1',
      title: await encryptRow('transactions', { title: 'Paycheck' }).then((r) => r.title),
      amount: await encryptRow('transactions', { amount: 5000 }).then((r) => r.amount),
      category: { id: 'c1', name: encCat.name, emoji: encCat.emoji },
    };
    const dec = await decryptRow('transactions', txRow);
    expect(dec.title).toBe('Paycheck');
    expect(dec.amount).toBe(5000);
    expect(dec.category.name).toBe('Salary');
    expect(dec.category.emoji).toBe('Salary');
  });

  it('decrypts the `categories` (default alias) embed used by reports', async () => {
    const encCat = await encryptRow('categories', { name: 'Travel' });
    const rows = await decryptRows('transactions', [
      { id: 't2', categories: { name: encCat.name } },
    ]);
    expect(rows[0].categories.name).toBe('Travel');
  });
});

describe('categories with encryption OFF', () => {
  beforeAll(() => setOff());
  afterAll(() => clear());

  it('passes name/emoji through as plaintext', async () => {
    const enc = await encryptRow('categories', { name: 'Custom', emoji: 'Shopping' });
    expect(enc.name).toBe('Custom');
    expect(enc.emoji).toBe('Shopping');
    const dec = await decryptRow('categories', enc);
    expect(dec.name).toBe('Custom');
  });

  it('deterministicCiphertext() returns plaintext when off (equality lookup still works)', async () => {
    const needle = await deterministicCiphertext('categories', 'name', 'Custom');
    expect(needle).toBe('Custom');
  });
});
