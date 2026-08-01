import { describe, it, expect, vi, beforeEach } from 'vitest';

// Regression cover for: converting a split transaction back to a single
// category left has_splits = true and orphaned transaction_splits rows. The
// edit form then reopened in split mode, and the stale children kept counting
// toward budget alerts.

const chains = {};
const makeChain = () => {
  const chain = {};
  for (const m of ['select', 'insert', 'update', 'delete', 'eq', 'order', 'range', 'in']) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn();
  return chain;
};

const mockFrom = vi.fn((table) => (chains[table] ||= makeChain()));
const mockGetSession = vi.fn();

// withAuth uses getSession (cached, no round-trip), not getUser.
vi.mock('../supabaseClient', () => ({
  supabase: { auth: { getSession: mockGetSession }, from: mockFrom, rpc: vi.fn() },
}));

// Encryption is exercised elsewhere; identity here keeps assertions on the
// written payload readable.
vi.mock('../crypto/rowCodec', () => ({
  encryptRow: vi.fn(async (_t, row) => row),
  decryptRow: vi.fn(async (_t, row) => row),
  decryptRows: vi.fn(async (_t, rows) => rows),
}));

vi.mock('../finance/budgetAlerts', () => ({
  checkBudgetNotifications: vi.fn(async () => {}),
}));

vi.mock('../api/userSettings', () => ({
  getWriteCurrency: vi.fn(async () => 'EUR'),
}));

const { updateTransaction } = await import('../api/transactions.js');

const USER = { id: 'user-123' };

beforeEach(() => {
  vi.clearAllMocks();
  for (const k of Object.keys(chains)) delete chains[k];
  mockGetSession.mockResolvedValue({ data: { session: { user: USER } }, error: null });
});

function primeUpdate(returned = {}) {
  const tx = mockFrom('transactions');
  tx.single.mockResolvedValue({
    data: { id: 'tx-1', has_splits: false, ...returned },
    error: null,
  });
  return tx;
}

// The split delete is `.delete().eq(...).eq(...)` and awaits the LAST eq, so
// the first must keep returning the chain and only the second resolves.
function primeSplitDelete(result = { error: null }) {
  const splits = mockFrom('transaction_splits');
  splits.eq.mockImplementationOnce(() => splits).mockImplementationOnce(() => result);
  return splits;
}

describe('updateTransaction: split -> single conversion', () => {
  it('writes has_splits: false when the caller turns splits off', async () => {
    primeUpdate();
    primeSplitDelete();

    await updateTransaction('tx-1', {
      amount: 100,
      categoryId: 'cat-food',
      has_splits: false,
    });

    const written = chains.transactions.update.mock.calls[0][0];
    expect(written.has_splits).toBe(false);
    expect(written.category_id).toBe('cat-food');
  });

  it('deletes the orphaned split rows for that transaction', async () => {
    primeUpdate();
    const splits = primeSplitDelete();

    await updateTransaction('tx-1', { amount: 100, categoryId: 'cat-food', has_splits: false });

    expect(splits.delete).toHaveBeenCalled();
    // Scoped to this transaction AND this user, never a bare delete.
    expect(splits.eq).toHaveBeenCalledWith('transaction_id', 'tx-1');
    expect(splits.eq).toHaveBeenCalledWith('user_id', USER.id);
  });

  it('surfaces a failed split delete instead of silently leaving orphans', async () => {
    primeUpdate();
    primeSplitDelete({ error: { message: 'boom' } });

    await expect(
      updateTransaction('tx-1', { amount: 100, categoryId: 'cat-food', has_splits: false })
    ).rejects.toBeTruthy();
  });
});

describe('updateTransaction: ordinary edits are untouched', () => {
  it('does not touch transaction_splits when has_splits is omitted', async () => {
    primeUpdate({ has_splits: true });

    // The recurring processor and other callers update without a split field;
    // they must not wipe a genuine split transaction's children.
    await updateTransaction('tx-1', { amount: 250, categoryId: 'cat-food' });

    expect(mockFrom).not.toHaveBeenCalledWith('transaction_splits');
    expect(chains.transactions.update.mock.calls[0][0]).not.toHaveProperty('has_splits');
  });

  it('does not clear splits when has_splits is true', async () => {
    primeUpdate({ has_splits: true });

    await updateTransaction('tx-1', { amount: 250, categoryId: null, has_splits: true });

    expect(mockFrom).not.toHaveBeenCalledWith('transaction_splits');
  });
});
