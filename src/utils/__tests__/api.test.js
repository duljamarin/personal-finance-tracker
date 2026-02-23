import { describe, it, expect, vi, beforeEach } from 'vitest';

// Supabase client mock
const makeChain = (overrides = {}) => {
  const chain = { select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(), eq: vi.fn(), neq: vi.fn(), order: vi.fn(), lte: vi.fn(), or: vi.fn(), single: vi.fn(), ...overrides };
  chain.select.mockReturnValue(chain); chain.insert.mockReturnValue(chain); chain.update.mockReturnValue(chain);
  chain.delete.mockReturnValue(chain); chain.eq.mockReturnValue(chain); chain.neq.mockReturnValue(chain);
  chain.order.mockReturnValue(chain); chain.lte.mockReturnValue(chain); chain.or.mockReturnValue(chain);
  return chain;
};

let currentChain;
const mockFrom = vi.fn(() => currentChain);
const mockGetUser = vi.fn();
const mockRpc = vi.fn();

vi.mock('../../utils/supabaseClient', () => ({
  supabase: { auth: { getUser: mockGetUser }, from: mockFrom, rpc: mockRpc },
}));

const { fetchCategories, addCategory, deleteCategory, addTransaction, updateTransaction, deleteTransaction, fetchTransactions, createGoal, deleteGoal, addContribution } = await import('../api.js');

const MOCK_USER = { id: 'user-123', email: 'test@example.com' };
function mockAuth(user = MOCK_USER) { mockGetUser.mockResolvedValue({ data: { user }, error: null }); }
function mockAuthFail() { mockGetUser.mockResolvedValue({ data: { user: null }, error: null }); }

// ---------------------------------------------------------------------------
// Category Tests
// ---------------------------------------------------------------------------
describe('Category API', () => {
  beforeEach(() => { vi.clearAllMocks(); currentChain = makeChain(); });

  it('fetchCategories returns data when authenticated', async () => {
    mockAuth();
    const mockData = [{ id: '1', name: 'Food', user_id: MOCK_USER.id }];
    currentChain.order.mockResolvedValue({ data: mockData, error: null });
    const result = await fetchCategories();
    expect(mockFrom).toHaveBeenCalledWith('categories');
    expect(result).toEqual(mockData);
  });

  it('fetchCategories returns empty array when not authenticated', async () => {
    mockAuthFail();
    const result = await fetchCategories();
    expect(result).toEqual([]);
  });

  it('fetchCategories throws on database error', async () => {
    mockAuth();
    currentChain.order.mockResolvedValue({ data: null, error: { message: 'DB error' } });
    await expect(fetchCategories()).rejects.toThrow();
  });

  it('addCategory throws when category already exists', async () => {
    mockAuth();
    currentChain.single.mockResolvedValueOnce({ data: { id: 'existing-id' }, error: null });
    await expect(addCategory({ name: 'Food' })).rejects.toThrow('Category already exists.');
  });

  it('addCategory throws when not authenticated', async () => {
    mockAuthFail();
    await expect(addCategory({ name: 'Food' })).rejects.toThrow('Please log in');
  });

  it('addCategory inserts a new category', async () => {
    mockAuth();
    currentChain.single
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({ data: { id: 'cat-1', name: 'Food', user_id: MOCK_USER.id }, error: null });
    const result = await addCategory({ name: 'Food' });
    expect(result).toMatchObject({ name: 'Food' });
  });

  it('deleteCategory returns OK on success', async () => {
    mockAuth();
    currentChain.eq.mockReturnValueOnce(currentChain).mockResolvedValueOnce({ error: null });
    const result = await deleteCategory('cat-1');
    expect(mockFrom).toHaveBeenCalledWith('categories');
    expect(result).toBe('OK');
  });

  it('deleteCategory throws on supabase error', async () => {
    mockAuth();
    currentChain.eq.mockResolvedValue({ error: { message: 'FK constraint' } });
    await expect(deleteCategory('cat-1')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Transaction Tests
// ---------------------------------------------------------------------------
describe('Transaction API', () => {
  beforeEach(() => { vi.clearAllMocks(); currentChain = makeChain(); });

  it('addTransaction defaults currency_code to EUR', async () => {
    mockAuth();
    const mockResult = { id: 'tx-1', title: 'Coffee', amount: 5, currency_code: 'EUR', exchange_rate: 1.0, base_amount: 5 };
    currentChain.single.mockResolvedValue({ data: mockResult, error: null });
    const result = await addTransaction({ title: 'Coffee', amount: 5, type: 'expense' });
    expect(result.currency_code).toBe('EUR');
  });

  it('addTransaction calculates base_amount as amount times exchangeRate', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data[0]; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await addTransaction({ title: 'USD purchase', amount: 100, type: 'expense', exchangeRate: 0.92 });
    expect(captured.base_amount).toBeCloseTo(92);
    expect(captured.exchange_rate).toBeCloseTo(0.92);
  });

  it('addTransaction uses exchange rate 1.0 as fallback', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data[0]; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await addTransaction({ title: 'Test', amount: 50, type: 'income' });
    expect(captured.base_amount).toBe(50);
    expect(captured.exchange_rate).toBe(1.0);
  });

  it('addTransaction always uses auth user_id not client-supplied', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data[0]; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await addTransaction({ title: 'Test', amount: 50, user_id: 'hacker-id' });
    expect(captured.user_id).toBe(MOCK_USER.id);
    expect(captured.user_id).not.toBe('hacker-id');
  });

  it('addTransaction strips frontend-only fields', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data[0]; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await addTransaction({
      title: 'Test', amount: 50,
      categoryId: 'cat-1', currencyCode: 'USD', exchangeRate: 1.1,
      updateRecurringTemplate: true, sourceRecurringId: 'rec-1',
      category: { id: 'cat-1', name: 'Food' },
    });
    expect(captured).not.toHaveProperty('categoryId');
    expect(captured).not.toHaveProperty('currencyCode');
    expect(captured).not.toHaveProperty('updateRecurringTemplate');
    expect(captured).not.toHaveProperty('category');
    expect(captured.category_id).toBe('cat-1');
    expect(captured.currency_code).toBe('USD');
  });

  it('addTransaction throws when not authenticated', async () => {
    mockAuthFail();
    await expect(addTransaction({ title: 'Test', amount: 50 })).rejects.toThrow('Please log in');
  });

  it('addTransaction propagates supabase errors', async () => {
    mockAuth();
    currentChain.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } });
    await expect(addTransaction({ title: 'Test', amount: 50 })).rejects.toThrow();
  });

  it('updateTransaction recalculates base_amount when both amount and rate change', async () => {
    mockAuth();
    let captured;
    currentChain.update.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await updateTransaction('tx-1', { amount: 200, exchangeRate: 0.85 });
    expect(captured.base_amount).toBeCloseTo(170);
  });

  it('updateTransaction falls back to rate 1.0 when only amount changes', async () => {
    mockAuth();
    let captured;
    currentChain.update.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await updateTransaction('tx-1', { amount: 100 });
    expect(captured.base_amount).toBe(100);
  });

  it('updateTransaction does not set base_amount when only rate changes', async () => {
    mockAuth();
    let captured;
    currentChain.update.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await updateTransaction('tx-1', { exchangeRate: 0.9 });
    expect(captured).not.toHaveProperty('base_amount');
  });

  it('deleteTransaction returns OK on success', async () => {
    mockAuth();
    currentChain.eq.mockReturnValueOnce(currentChain).mockResolvedValueOnce({ error: null });
    const result = await deleteTransaction('tx-1');
    expect(mockFrom).toHaveBeenCalledWith('transactions');
    expect(result).toBe('OK');
  });

  it('deleteTransaction throws when not authenticated', async () => {
    mockAuthFail();
    await expect(deleteTransaction('tx-1')).rejects.toThrow('Please log in');
  });

  it('fetchTransactions returns data for authenticated user', async () => {
    mockAuth();
    const mockData = [{ id: 'tx-1', title: 'Salary', amount: 1000 }];
    currentChain.order.mockResolvedValue({ data: mockData, error: null });
    const result = await fetchTransactions();
    expect(mockFrom).toHaveBeenCalledWith('transactions');
    expect(result).toEqual(mockData);
  });

  it('fetchTransactions returns empty array when not authenticated', async () => {
    mockAuthFail();
    const result = await fetchTransactions();
    expect(result).toEqual([]);
  });

  it('fetchTransactions returns empty array fallback when data is null', async () => {
    mockAuth();
    currentChain.order.mockResolvedValue({ data: null, error: null });
    const result = await fetchTransactions();
    expect(result).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Goal Tests
// ---------------------------------------------------------------------------
describe('Goal API', () => {
  beforeEach(() => { vi.clearAllMocks(); currentChain = makeChain(); });

  it('createGoal uses user_id from auth not client', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: { id: 'goal-1' }, error: null });
    await createGoal({ name: 'Emergency Fund', targetAmount: 5000, goalType: 'savings', priority: 1 });
    expect(captured.user_id).toBe(MOCK_USER.id);
    expect(captured.name).toBe('Emergency Fund');
    expect(captured.target_amount).toBe(5000);
  });

  it('createGoal defaults goal_type to savings', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await createGoal({ name: 'Test Goal', targetAmount: 1000 });
    expect(captured.goal_type).toBe('savings');
  });

  it('createGoal defaults priority to 2', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    await createGoal({ name: 'Test', targetAmount: 500 });
    expect(captured.priority).toBe(2);
  });

  it('createGoal throws when not authenticated', async () => {
    mockAuthFail();
    await expect(createGoal({ name: 'Test', targetAmount: 1000 })).rejects.toThrow('Please log in');
  });

  it('deleteGoal returns true on success', async () => {
    mockAuth();
    currentChain.eq.mockReturnValueOnce(currentChain).mockResolvedValueOnce({ error: null });
    const result = await deleteGoal('goal-1');
    expect(mockFrom).toHaveBeenCalledWith('goals');
    expect(result).toBe(true);
  });

  it('deleteGoal throws on supabase error', async () => {
    mockAuth();
    currentChain.eq.mockReturnValueOnce(currentChain).mockResolvedValueOnce({ error: { message: 'Not found' } });
    await expect(deleteGoal('goal-1')).rejects.toThrow();
  });

  it('addContribution inserts with correct goal_id and user_id', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: { id: 'contrib-1' }, error: null });
    await addContribution('goal-1', { amount: 500, date: '2025-01-15', note: 'Monthly saving' });
    expect(captured.user_id).toBe(MOCK_USER.id);
    expect(captured.goal_id).toBe('goal-1');
    expect(captured.amount).toBe(500);
  });

  it('addContribution defaults contribution_date to today', async () => {
    mockAuth();
    let captured;
    currentChain.insert.mockImplementation((data) => { captured = data; return currentChain; });
    currentChain.single.mockResolvedValue({ data: {}, error: null });
    const today = new Date().toISOString().split('T')[0];
    await addContribution('goal-1', { amount: 100 });
    expect(captured.contribution_date).toBe(today);
  });
});
