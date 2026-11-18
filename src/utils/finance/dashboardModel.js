// Pure data shaping for the Bento dashboard tiles. Every figure comes from the
// user's real (decrypted) transactions, budgets, goals and recurring rules.
import { baseAmountOf } from './shared';

const pad2 = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM' for a Date. */
export const monthKeyOf = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;

/** First day of the month `offset` months from `ref` (local time). */
export const addMonths = (ref, offset) => new Date(ref.getFullYear(), ref.getMonth() + offset, 1);

export const daysInMonth = (ref) => new Date(ref.getFullYear(), ref.getMonth() + 1, 0).getDate();

export const isSameMonth = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();

const signedAmount = (tx) => (tx.type === 'income' ? 1 : tx.type === 'expense' ? -1 : 0) * baseAmountOf(tx);

/**
 * Income / expense for the month of `monthRef`, plus the same day-span of the
 * previous month. For the current month the span is 1st..today (a partial month
 * compared with a full one would make every early-month delta look like a
 * collapse); for a past month it is the whole month.
 */
export function monthTotals(transactions, monthRef, now = new Date()) {
  const curKey = monthKeyOf(monthRef);
  const prevKey = monthKeyOf(addMonths(monthRef, -1));
  const span = isSameMonth(monthRef, now) ? now.getDate() : 31;
  const out = { income: 0, expense: 0, prevIncome: 0, prevExpense: 0, hasPrev: false, count: 0 };
  for (const tx of transactions || []) {
    const date = tx.date || '';
    const key = date.slice(0, 7);
    if (key === curKey) {
      out.count += 1;
      if (tx.type === 'income') out.income += baseAmountOf(tx);
      else if (tx.type === 'expense') out.expense += baseAmountOf(tx);
    } else if (key === prevKey) {
      out.hasPrev = true;
      if (Number(date.slice(8, 10)) > span) continue;
      if (tx.type === 'income') out.prevIncome += baseAmountOf(tx);
      else if (tx.type === 'expense') out.prevExpense += baseAmountOf(tx);
    }
  }
  return out;
}

/** Monthly income minus expenses for `count` months ending at `monthRef`. */
export function keptSeries(transactions, monthRef, count = 6) {
  const keys = Array.from({ length: count }, (_, i) => monthKeyOf(addMonths(monthRef, i - count + 1)));
  const sums = Object.fromEntries(keys.map((k) => [k, 0]));
  for (const tx of transactions || []) {
    const k = (tx.date || '').slice(0, 7);
    if (k in sums) sums[k] += signedAmount(tx);
  }
  return keys.map((key, i) => ({ key, date: addMonths(monthRef, i - count + 1), kept: sums[key] }));
}

/**
 * Running balance (net of every transaction) at the end of each of the `count`
 * months ending at `monthRef`. Same definition as the balance KPI, so the last
 * point equals the KPI when `monthRef` is the current month.
 */
export function balanceSeries(transactions, monthRef, count = 8) {
  const firstKey = monthKeyOf(addMonths(monthRef, -count + 1));
  const kept = keptSeries(transactions, monthRef, count);
  let opening = 0;
  for (const tx of transactions || []) {
    if ((tx.date || '').slice(0, 7) < firstKey) opening += signedAmount(tx);
  }
  let running = opening;
  return kept.map((m) => {
    running += m.kept;
    return { key: m.key, date: m.date, balance: running };
  });
}

/**
 * Spending split for the stacked bar: the month's top `top` categories by
 * spend, the rest grouped as "other". `expensesByCategory` is the
 * category_id -> amount map from fetchMonthlyExpensesByCategory (split
 * transactions already attributed to their parts).
 */
export function categoryStack(expensesByCategory, categories, top = 5) {
  const byId = new Map((categories || []).map((c) => [String(c.id), c]));
  const rows = Object.entries(expensesByCategory || {})
    .map(([id, value]) => ({ id: String(id), value: Number(value) || 0, category: byId.get(String(id)) || null }))
    .filter((r) => r.value > 0)
    .sort((a, b) => b.value - a.value);
  const head = rows.slice(0, top);
  const rest = rows.slice(top).reduce((sum, r) => sum + r.value, 0);
  return { head, other: rest };
}

/**
 * Activity rows for the dashboard: the selected month's transactions from
 * the last 7 days (counted back from today, or from the month's last day for
 * a past month), at most `max` rows, grouped by day, newest first.
 */
export function activityRows(transactions, monthRef, { now = new Date(), days = 7, max = 8, filter = 'all' } = {}) {
  const key = monthKeyOf(monthRef);
  const anchor = isSameMonth(monthRef, now)
    ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
    : new Date(monthRef.getFullYear(), monthRef.getMonth(), daysInMonth(monthRef));
  const from = new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - (days - 1));
  const fromIso = `${from.getFullYear()}-${pad2(from.getMonth() + 1)}-${pad2(from.getDate())}`;
  const rows = (transactions || [])
    .filter((tx) => (tx.date || '').slice(0, 7) === key && (tx.date || '').slice(0, 10) >= fromIso)
    .filter((tx) => filter === 'all' || (filter === 'income' ? tx.type === 'income' : tx.type === 'expense'))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return rows.slice(0, max);
}

/** Consecutive rows sharing a date become one group, with the day's net. */
export function groupByDay(rows) {
  const groups = [];
  for (const row of rows) {
    const day = (row.date || '').slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.items.push(row);
    else groups.push({ day, items: [row] });
  }
  return groups.map((g) => ({ ...g, net: g.items.reduce((s, tx) => s + signedAmount(tx), 0) }));
}

/** Whole days from today to an ISO date (0 = today). */
export function daysUntil(iso, now = new Date()) {
  if (!iso) return null;
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  const target = Date.UTC(y, m - 1, d);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86400000);
}

/** Next `count` active recurring rules by next_run_at, from today on. */
export function upcomingRecurring(recurrings, { now = new Date(), count = 3 } = {}) {
  return (recurrings || [])
    .filter((r) => r.is_active && r.next_run_at)
    .map((r) => ({ ...r, inDays: daysUntil(r.next_run_at, now) }))
    .filter((r) => r.inDays !== null && r.inDays >= 0)
    .sort((a, b) => String(a.next_run_at).localeCompare(String(b.next_run_at)))
    .slice(0, count);
}

/**
 * Health score pillars as weighted points (they sum to the total score).
 * Weights mirror computeHealthScore in utils/finance/healthScore.js.
 */
export const HEALTH_PILLARS = [
  { key: 'budgetAdherenceScore', labelKey: 'healthScore.budgetAdherence', weight: 40 },
  { key: 'incomeExpenseRatioScore', labelKey: 'healthScore.incomeRatio', weight: 30 },
  { key: 'spendingVolatilityScore', labelKey: 'healthScore.consistency', weight: 20 },
  { key: 'savingsConsistencyScore', labelKey: 'healthScore.savings', weight: 10 },
];

export function healthPoints(score) {
  return HEALTH_PILLARS.map((p) => ({
    ...p,
    points: Math.round(((Number(score?.[p.key]) || 0) * p.weight) / 100),
  }));
}
