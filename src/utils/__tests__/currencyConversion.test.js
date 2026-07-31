import { describe, it, expect, vi, beforeEach } from 'vitest';

// Amounts are E2E-encrypted in production; the codec is exercised by its own
// tests, so here it is a pass-through and we assert on the numbers themselves.
vi.mock('../crypto/rowCodec', () => ({
  decryptRows: async (_table, rows) => rows,
  encryptRow: async (_table, payload) => payload,
}));

const state = {
  settings: null,
  tables: {},
  updates: [],
  failTable: null,
};

function makeQuery(table) {
  const q = {
    _filters: {},
    select() { return q; },
    eq(col, val) { q._filters[col] = val; return q; },
    in(col, vals) { q._filters[col] = vals; return q; },
    gt(col, val) { q._filters['gt_' + col] = val; return q; },
    order() { return q; },
    limit() { return q; },
    maybeSingle: async () => ({ data: state.settings, error: null }),
    single: async () => ({ data: state.settings, error: null }),
    update(patch) {
      if (table === 'user_settings') {
        state.settings = { ...state.settings, ...patch };
        return { eq: async () => ({ error: null }) };
      }
      return {
        eq: async (_c, id) => {
          if (state.failTable === table) {
            return { error: new Error('write failed') };
          }
          state.updates.push({ table, id, patch });
          const row = (state.tables[table] || []).find((r) => r.id === id);
          if (row) Object.assign(row, patch);
          return { error: null };
        },
      };
    },
    then(resolve) {
      // Batch fetch: rows after the cursor, ordered by id.
      const rows = state.tables[table] || [];
      const after = q._filters.gt_id;
      const filtered = after ? rows.filter((r) => r.id > after) : rows;
      return Promise.resolve(resolve({ data: filtered, error: null }));
    },
  };
  return q;
}

vi.mock('../api/_auth', () => ({
  getSupabase: async () => ({ from: (table) => makeQuery(table) }),
}));

const { convertAllAmounts, getPendingConversion } = await import('../currencyConversion.js');

beforeEach(() => {
  state.settings = { user_id: 'u1', preferred_currency: 'ALL', conversion_state: null, conversion_cursor: {} };
  state.tables = {};
  state.updates = [];
  state.failTable = null;
  // navigator.locks is absent in jsdom; the runner treats that as "no lock
  // needed" and proceeds, which is what we want under test.
  if (typeof navigator !== 'undefined' && navigator.locks) delete navigator.locks;
});

describe('convertAllAmounts', () => {
  it('scales every money field by the rate', async () => {
    state.tables.transactions = [
      { id: 'a', amount: 1000, base_amount: 1000 },
      { id: 'b', amount: 250.5, base_amount: 250.5 },
    ];

    const result = await convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 0.01 });

    expect(result).toBe('done');
    expect(state.tables.transactions[0].amount).toBe(10);
    expect(state.tables.transactions[1].amount).toBe(2.51); // rounded to 2dp
  });

  it('sets the new currency only after the conversion finishes', async () => {
    state.tables.transactions = [{ id: 'a', amount: 100, base_amount: 100 }];

    await convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 0.5 });

    expect(state.settings.preferred_currency).toBe('EUR');
    expect(state.settings.conversion_state).toBeNull();
  });

  it('keeps the old currency and the cursor when a write fails midway', async () => {
    state.tables.transactions = [{ id: 'a', amount: 100, base_amount: 100 }];
    state.tables.goals = [{ id: 'g', target_amount: 50, current_amount: 10 }];
    state.failTable = 'goals';

    await expect(
      convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 0.5 })
    ).rejects.toThrow(/write failed/);

    // The label must not move: the data is only partly converted, and the
    // surviving cursor is what lets a resume finish it.
    expect(state.settings.preferred_currency).toBe('ALL');
    expect(state.settings.conversion_state).toBe('converting');
    expect(state.settings.conversion_cursor.transactions).toBe('done');
  });

  it('resumes with the pinned rate, ignoring a different rate passed in', async () => {
    // A previous run was interrupted after transactions, pinned at 0.01.
    state.settings = {
      user_id: 'u1',
      preferred_currency: 'ALL',
      conversion_state: 'converting',
      conversion_cursor: { transactions: 'done' },
      conversion_from: 'ALL',
      conversion_to: 'EUR',
      conversion_rate: 0.01,
    };
    state.tables.transactions = [{ id: 'a', amount: 10, base_amount: 10 }]; // already converted
    state.tables.goals = [{ id: 'g', target_amount: 1000, current_amount: 500 }];

    // Caller passes a wildly different rate; the pinned 0.01 must win.
    await convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 999 });

    expect(state.tables.goals[0].target_amount).toBe(10);
    expect(state.tables.goals[0].current_amount).toBe(5);
  });

  it('does not re-convert a table already marked done', async () => {
    state.settings = {
      user_id: 'u1',
      preferred_currency: 'ALL',
      conversion_state: 'converting',
      conversion_cursor: { transactions: 'done' },
      conversion_from: 'ALL',
      conversion_to: 'EUR',
      conversion_rate: 0.01,
    };
    state.tables.transactions = [{ id: 'a', amount: 10, base_amount: 10 }];

    await convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 0.01 });

    // Untouched: still 10, not 0.1.
    expect(state.tables.transactions[0].amount).toBe(10);
    expect(state.updates.filter((u) => u.table === 'transactions')).toHaveLength(0);
  });

  it('rejects a non-positive rate', async () => {
    await expect(
      convertAllAmounts('u1', { from: 'ALL', to: 'EUR', rate: 0 })
    ).rejects.toThrow(/rate/i);
  });
});

describe('getPendingConversion', () => {
  it('returns null when idle', async () => {
    expect(await getPendingConversion('u1')).toBeNull();
  });

  it('reports an interrupted run so the UI can resume it', async () => {
    state.settings = {
      conversion_state: 'converting',
      conversion_from: 'ALL',
      conversion_to: 'EUR',
      conversion_rate: 0.01,
      conversion_cursor: { transactions: 'x' },
    };

    const pending = await getPendingConversion('u1');
    expect(pending).toMatchObject({ from: 'ALL', to: 'EUR', rate: 0.01 });
  });
});
