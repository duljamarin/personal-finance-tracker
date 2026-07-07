import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { encryptRow, decryptRow } from '../crypto/rowCodec.js';
import { setUnlocked, setOff, setLocked, clear } from '../crypto/keyring.js';
import { generateRawDEK, importDEK, isEncrypted } from '../crypto/cipher.js';
import { FIELD_MAP, NUMERIC_FIELDS, JSON_FIELDS } from '../crypto/fieldMap.js';

const SAMPLE_INSIGHTS = [
  { type: 'income_expense', status: 'positive', savings: 1234.56, savingsPercent: 42 },
  { type: 'budget', status: 'all_good', totalCategories: 7 },
  { type: 'savings', status: 'saving', amount: 1234.56 },
];

function sampleRow() {
  return {
    user_id: 'u1',
    month_date: '2026-07-01',
    total_score: 92.9,
    budget_adherence_score: 100,
    income_expense_ratio_score: 100,
    spending_volatility_score: 100,
    savings_consistency_score: 29.29,
    categories_over_budget: 0,
    categories_within_budget: 3,
    total_income: 5000,
    total_expenses: 3765.44,
    savings_amount: 1234.56,
    insights: SAMPLE_INSIGHTS,
  };
}

describe('financial_health_scores field map', () => {
  it('registers every score + count column as encrypted and numeric', () => {
    const expected = [
      'total_score',
      'budget_adherence_score',
      'income_expense_ratio_score',
      'spending_volatility_score',
      'savings_consistency_score',
      'categories_over_budget',
      'categories_within_budget',
    ];
    for (const f of expected) {
      expect(FIELD_MAP.financial_health_scores).toContain(f);
      expect(NUMERIC_FIELDS.financial_health_scores).toContain(f);
    }
  });

  it('registers insights as a JSON field', () => {
    expect(JSON_FIELDS.financial_health_scores).toContain('insights');
    expect(FIELD_MAP.financial_health_scores).toContain('insights');
  });
});

describe('health score round-trip (encryption ON)', () => {
  beforeAll(async () => {
    const raw = generateRawDEK();
    const key = await importDEK(raw);
    setUnlocked(key);
  });
  afterAll(() => clear());

  it('encrypts scores and insights as ciphertext, decrypts to numbers + object', async () => {
    const enc = await encryptRow('financial_health_scores', sampleRow());

    // scores stored as ciphertext text
    expect(isEncrypted(enc.total_score)).toBe(true);
    expect(isEncrypted(enc.savings_consistency_score)).toBe(true);
    expect(isEncrypted(enc.categories_within_budget)).toBe(true);
    // insights is a SINGLE ciphertext string, not an array of ciphertexts
    expect(typeof enc.insights).toBe('string');
    expect(isEncrypted(enc.insights)).toBe(true);

    const dec = await decryptRow('financial_health_scores', enc);
    expect(dec.total_score).toBe(92.9);
    expect(typeof dec.total_score).toBe('number');
    expect(dec.categories_within_budget).toBe(3);
    expect(dec.insights).toEqual(SAMPLE_INSIGHTS);
  });

  it('keeps NULL insights as NULL', async () => {
    const enc = await encryptRow('financial_health_scores', { ...sampleRow(), insights: null });
    expect(enc.insights).toBeNull();
    const dec = await decryptRow('financial_health_scores', enc);
    expect(dec.insights).toBeNull();
  });
});

describe('health score round-trip (encryption OFF - plaintext text columns)', () => {
  beforeAll(() => setOff());
  afterAll(() => clear());

  it('serializes insights to a JSON string for the text column', async () => {
    const enc = await encryptRow('financial_health_scores', sampleRow());
    // not encrypted, but must be a string (text column can't take a raw array)
    expect(typeof enc.insights).toBe('string');
    expect(isEncrypted(enc.insights)).toBe(false);
    expect(JSON.parse(enc.insights)).toEqual(SAMPLE_INSIGHTS);
  });

  it('coerces plaintext score strings back to Number and parses insights', async () => {
    // Simulate a row read straight from text columns (plaintext).
    const dec = await decryptRow('financial_health_scores', {
      total_score: '92.9',
      categories_within_budget: '3',
      insights: JSON.stringify(SAMPLE_INSIGHTS),
    });
    expect(dec.total_score).toBe(92.9);
    expect(dec.categories_within_budget).toBe(3);
    expect(dec.insights).toEqual(SAMPLE_INSIGHTS);
  });

  it('tolerates pre-migration already-parsed jsonb insights', async () => {
    // Before the migration, PostgREST returned insights as a real array.
    const dec = await decryptRow('financial_health_scores', {
      total_score: 92.9,
      insights: SAMPLE_INSIGHTS,
    });
    expect(dec.insights).toEqual(SAMPLE_INSIGHTS);
  });
});

describe('health score read while locked', () => {
  afterAll(() => clear());

  it('returns null (not a crash) for encrypted scores and insights', async () => {
    const raw = generateRawDEK();
    const key = await importDEK(raw);
    setUnlocked(key);
    const enc = await encryptRow('financial_health_scores', sampleRow());
    setLocked(); // has keys but no DEK this session

    const dec = await decryptRow('financial_health_scores', enc);
    expect(dec.total_score).toBeNull();
    expect(dec.insights).toBeNull();
  });
});
