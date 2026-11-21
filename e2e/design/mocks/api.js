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
export const fetchGoalsStats = () => ok({ totalGoals: GOALS.length, activeGoals: 2, completedGoals: 1, totalSaved: GOALS.reduce((s, g) => s + g.current_amount, 0), totalTarget: GOALS.reduce((s, g) => s + g.target_amount, 0) });

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
// A few categories with history so the benchmark cards (status pill and the
// "% vs your normal" figure) render in the harness.
const bench = (name, avg, current, sd, status) => {
  const c = CATEGORIES.find((x) => x.name === name) || CATEGORIES[0];
  const band = sd === 0 ? avg * 0.2 : sd;
  return {
    category_id: c.id, category_name: c.name, avg_monthly_spending: avg, std_deviation: sd,
    lower_threshold: Math.max(0, avg - band), upper_threshold: avg + band,
    current_month_spending: current, months_with_data: 6, status,
  };
};
export const fetchCategoryBenchmarks = () => ok([
  bench('Housing & Rent', 650, 650, 0, 'within'),
  bench('Food & Dining', 349, 412, 40, 'above'),
  bench('Entertainment', 100, 137, 30, 'above'),
  bench('Transportation', 150, 96, 30, 'below'),
]);

const ASSETS = [
  { id: 'a1', name: 'Savings account', type: 'asset', asset_type: 'savings', current_value: 8200 },
  { id: 'a2', name: 'Index fund', type: 'asset', asset_type: 'investment', current_value: 5400 },
  { id: 'l1', name: 'Car loan', type: 'liability', asset_type: 'car_loan', current_value: 6100 },
];
export const fetchAssets = () => ok(ASSETS);
export const addAsset = ok;
export const updateAsset = ok;
export const deleteAsset = ok;
export const fetchNetWorthHistory = () => ok(Array.from({ length: 8 }, (_, i) => {
  const d = new Date(); d.setMonth(d.getMonth() - 7 + i, 1);
  return { snapshot_date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`, total_assets: 11000 + i * 380, total_liabilities: 7800 - i * 230 };
}));

export const fetchNotifications = () => ok([
  { id: 'n1', notification_type: 'budget_exceeded', title: 'Budget exceeded', message: 'Transportation is over its monthly budget.', is_read: false, created_at: new Date().toISOString(), metadata: {} },
  { id: 'n2', notification_type: 'goal_milestone', title: 'Goal milestone', message: 'Emergency fund passed 70%.', is_read: false, created_at: new Date(Date.now() - 86400000).toISOString(), metadata: {} },
  { id: 'n3', notification_type: 'recurring_upcoming', title: 'Upcoming payment', message: 'Phone plan runs in 4 days.', is_read: true, created_at: new Date(Date.now() - 3 * 86400000).toISOString(), metadata: {} },
]);
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
