// In-memory stand-in for src/utils/api (design harness only).
import { CATEGORIES, TRANSACTIONS, budgetsFor, GOALS, RECURRING } from './fixtures';
import { computeHealthScore } from '../../../src/utils/finance/healthScore';
import { store } from './store';

export { calculateNextDate } from '../../../src/utils/api/recurring';

const ok = async (v) => v;
const pad = (n) => String(n).padStart(2, '0');

export const fetchCategories = () => ok(CATEGORIES);
export const addCategory = async (c) => ({ id: `c${Date.now()}`, ...c });
export const updateCategory = ok;
export const deleteCategory = ok;

export const fetchTransactions = () => ok(store.transactions);
export const fetchTransactionsForReport = () => ok(store.transactions);
export const addTransaction = async (t) => ({
  id: `n${Date.now()}`, ...t, category_id: t.categoryId,
  category: CATEGORIES.find((c) => c.id === t.categoryId), base_amount: t.amount,
});
export const updateTransaction = async (id, t) => ({ id, ...t, base_amount: t.amount, category: CATEGORIES.find((c) => c.id === t.categoryId) });
export const deleteTransaction = ok;
export const addTransactionWithSplits = ok;
export const updateTransactionWithSplits = ok;
export const fetchTransactionSplits = () => ok([]);
export const fetchSplitsForTransactions = () => ok({});
export const bulkImportTransactions = ok;

export const fetchRecurringTransactions = () => ok(RECURRING);
export const addRecurringTransaction = ok;
export const updateRecurringTransaction = ok;
export const deleteRecurringTransaction = ok;
export const pauseRecurringTransaction = ok;
export const resumeRecurringTransaction = ok;
export const processRecurringTransactions = () => ok({ generated: 0 });

export const fetchGoals = () => ok(GOALS);
export const fetchGoalById = async (id) => GOALS.find((g) => g.id === id);
export const createGoal = ok;
export const updateGoal = ok;
export const deleteGoal = ok;
export const addContribution = ok;
export const fetchGoalsStats = () => ok({ total: GOALS.length, completed: 1, active: 2 });

export const fetchBudgets = (y, m) => ok(budgetsFor(y, m));
export const createBudget = ok;
export const updateBudget = ok;
export const deleteBudget = ok;
export async function fetchMonthlyExpensesByCategory(y, m) {
  const key = `${y}-${pad(m)}`;
  const totals = {};
  for (const tx of store.transactions) {
    if (tx.type === 'expense' && tx.date.startsWith(key)) totals[tx.category_id] = (totals[tx.category_id] || 0) + tx.amount;
  }
  return totals;
}

export async function fetchHealthScore({ month } = {}) {
  const d = month ? new Date(month) : new Date();
  const monthDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  return { monthDate, ...computeHealthScore(store.transactions, CATEGORIES, monthDate) };
}
export async function fetchHealthScoreHistory(months = 12) {
  const now = new Date();
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthDate = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
    return { monthDate, ...computeHealthScore(store.transactions, CATEGORIES, monthDate) };
  });
}
export const fetchCategoryBenchmarks = () => ok([]);

export const fetchAssets = () => ok([]);
export const addAsset = ok;
export const updateAsset = ok;
export const deleteAsset = ok;
export const fetchNetWorthHistory = () => ok([]);

export const fetchNotifications = () => ok([]);
export const markNotificationAsRead = ok;
export const markAllNotificationsAsRead = ok;
export const deleteNotification = ok;
export const getUnreadNotificationCount = () => ok(2);
export const fetchNotificationSettings = () => ok({});
export const updateNotificationSettings = ok;

export const fetchSubscription = () => ok({ subscription_status: 'active' });
export const getMonthlyTransactionCount = () => ok(12);
export const checkTrialExpiringNotifications = ok;
export const startFreeTrial = ok;
export const deleteUserAccount = ok;
export const fetchUserSettings = () => ok({ preferredCurrency: 'EUR' });
export const updatePreferredCurrency = ok;
export const wipeFinancialDataOnKeyReset = ok;
