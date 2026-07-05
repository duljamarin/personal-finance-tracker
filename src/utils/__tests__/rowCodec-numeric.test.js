import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptRow, decryptRow } from '../crypto/rowCodec.js';
import { setUnlocked, setOff, clear } from '../crypto/keyring.js';
import { generateRawDEK, importDEK, isEncrypted } from '../crypto/cipher.js';
import { NUMERIC_FIELDS, FIELD_MAP } from '../crypto/fieldMap.js';

describe('rowCodec numeric round-trip (encryption ON)', () => {
  beforeAll(async () => {
    const raw = generateRawDEK();
    const key = await importDEK(raw);
    setUnlocked(key);
  });

  afterAll(() => {
    clear();
  });

  it('encrypts numeric transaction fields as ciphertext and decrypts back to Number', async () => {
    const enc = await encryptRow('transactions', {
      title: 'Groceries',
      amount: 123.45,
      base_amount: 123.45,
      exchange_rate: 1.0,
    });

    // amount is a numeric field in FIELD_MAP → stored encrypted (text)
    if (FIELD_MAP.transactions.includes('amount')) {
      expect(isEncrypted(enc.amount)).toBe(true);
      expect(isEncrypted(enc.base_amount)).toBe(true);
    }
    // exchange_rate stays plaintext (not in FIELD_MAP)
    expect(enc.exchange_rate).toBe(1.0);

    const dec = await decryptRow('transactions', enc);
    expect(dec.amount).toBe(123.45);
    expect(dec.base_amount).toBe(123.45);
    expect(typeof dec.amount).toBe('number');
    expect(dec.title).toBe('Groceries');
  });

  it('round-trips a zero amount correctly', async () => {
    const enc = await encryptRow('goals', { current_amount: 0, target_amount: 500, name: 'Car' });
    const dec = await decryptRow('goals', enc);
    expect(dec.current_amount).toBe(0);
    expect(dec.target_amount).toBe(500);
  });

  it('leaves null numeric fields as null', async () => {
    const enc = await encryptRow('transactions', { amount: 10, base_amount: null });
    const dec = await decryptRow('transactions', enc);
    expect(dec.base_amount).toBeNull();
  });
});

describe('rowCodec numeric coercion (encryption OFF - plaintext text columns)', () => {
  beforeAll(() => {
    setOff();
  });
  afterAll(() => {
    clear();
  });

  it('coerces plaintext numeric strings back to Number on read', async () => {
    // Simulate a row read from a text column with a plaintext number string.
    const dec = await decryptRow('transactions', {
      amount: '99.9',
      base_amount: '99.9',
      title: 'Cash',
    });
    expect(dec.amount).toBe(99.9);
    expect(typeof dec.amount).toBe('number');
  });

  it('passes through raw numbers unchanged', async () => {
    const dec = await decryptRow('budgets', { amount: 250 });
    expect(dec.amount).toBe(250);
  });
});

describe('NUMERIC_FIELDS registry', () => {
  it('lists amount fields for core money tables', () => {
    expect(NUMERIC_FIELDS.transactions).toContain('amount');
    expect(NUMERIC_FIELDS.transactions).toContain('base_amount');
    expect(NUMERIC_FIELDS.budgets).toContain('amount');
    expect(NUMERIC_FIELDS.goals).toContain('current_amount');
  });
});
