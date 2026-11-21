/**
 * The landing page's one demo dataset (landing conversion spec 1.2).
 *
 * Every number the landing page shows (hero preview, feature minis, how-it-
 * works snippets, trust example) is imported from here or computed from it.
 * The INPUTS block holds the only hardcoded demo values; everything else is
 * derived, and components must use the derived exports instead of redoing the
 * math, so two places can never disagree (invariants D1 and D2, guarded by
 * demoData.test.js).
 */
import { formatCurrency } from '../../utils/formatCurrency';
import { CURRENCY_SYMBOLS } from '../../utils/constants';

// ── Inputs ───────────────────────────────────────────────────────────────────

export const CURRENCY = 'EUR';
export const INCOME = 3800;

/**
 * spent = this month so far, limit = monthly budget, normal = the user's own
 * average of past months (what benchmarks compare against). iconKey is the
 * stock category icon (CategoryIconSvg); labels come from i18n by `key`.
 */
export const CATEGORIES = [
  { key: 'housing',       iconKey: 'Housing & Rent', spent: 650, limit: 650, normal: 650 },
  { key: 'food',          iconKey: 'Food & Dining',  spent: 412, limit: 600, normal: 349 },
  { key: 'entertainment', iconKey: 'Entertainment',  spent: 137, limit: 200, normal: 100 },
  { key: 'shopping',      iconKey: 'Shopping',       spent: 107, limit: 300, normal: 140 },
  { key: 'transport',     iconKey: 'Transportation', spent: 96,  limit: 160, normal: 150 },
];

export const BALANCE = 12480.35;

/** Health score parts, each out of 25. */
export const HEALTH_PARTS = { budgetsKept: 17, spendingVsIncome: 19, stability: 16, positiveMonths: 18 };
export const HEALTH_PREV = 66;

/**
 * Kept (income minus spending) per month, oldest first; the last entry is
 * this month and must equal KEPT (asserted below in dev and in the test).
 * Two expensive months, a steady rest, and this month the best so far. The
 * twelve sum to less than BALANCE, so the all-time balance and the 12-month
 * "kept" total never contradict each other.
 */
export const KEPT_LAST_12 = [900, 950, 200, 920, 980, 900, 100, 1010, 1040, 1100, 1150, 2398];

export const GOALS = [
  { name: 'emergencyFund', current: 4320, target: 6000 },
  { name: 'trip', current: 800, target: 2000 },
];

export const LAST_TX = { key: 'market', category: 'food', amount: 64.20 };

/** A goal is on track when current / target >= ON_TRACK_MIN. */
export const ON_TRACK_MIN = 0.35;

/** Fixed "today" inside the demo month, so forecasts do not move day to day. */
export const DAY_OF_MONTH = 18;

// ── Calendar (from the user's clock) ─────────────────────────────────────────

const NOW = new Date();
export const YEAR = NOW.getFullYear();
export const MONTH_INDEX = NOW.getMonth();
export const PREV_MONTH_INDEX = (MONTH_INDEX + 11) % 12;
export const DAYS_IN_MONTH = new Date(YEAR, MONTH_INDEX + 1, 0).getDate();

/** Date objects for labelling: this month, last month, and the 12-month window. */
export const monthDate = (offset = 0) => new Date(YEAR, MONTH_INDEX + offset, 1);
export const LAST_12_MONTH_DATES = KEPT_LAST_12.map((_, i) => monthDate(i - (KEPT_LAST_12.length - 1)));

// ── Derived (never recompute these elsewhere) ────────────────────────────────

const sum = (xs) => xs.reduce((s, v) => s + v, 0);

export const SPENDING = sum(CATEGORIES.map((c) => c.spent));
export const KEPT = INCOME - SPENDING;
export const SAVINGS_RATE = Math.round((KEPT / INCOME) * 100);
export const HEALTH = sum(Object.values(HEALTH_PARTS));
export const HEALTH_DELTA = HEALTH - HEALTH_PREV;

export const budgetPct = (c) => Math.round((c.spent / c.limit) * 100);
export const benchmarkPct = (c) => (c.normal === 0 ? 0 : Math.round(((c.spent - c.normal) / c.normal) * 100));
export const forecast = (c) => Math.round((c.spent / DAY_OF_MONTH) * DAYS_IN_MONTH);

export const budgetsKeptPct = Math.round(
  (CATEGORIES.filter((c) => c.spent <= c.limit).length / CATEGORIES.length) * 100,
);
export const goalsOnTrack = `${GOALS.filter((g) => g.current / g.target >= ON_TRACK_MIN).length}/${GOALS.length}`;

export const category = (key) => CATEGORIES.find((c) => c.key === key);

/** The n categories with the highest budget use (ties: higher raw ratio first). */
export const topBudgets = (n) =>
  CATEGORIES
    .filter((c) => c.limit > 0)
    .slice()
    .sort((a, b) => budgetPct(b) - budgetPct(a) || b.spent / b.limit - a.spent / a.limit)
    .slice(0, n);

/** Running balance over the last 12 months, ending at BALANCE (hero sparkline). */
export const BALANCE_LAST_12 = (() => {
  let running = BALANCE - sum(KEPT_LAST_12);
  return KEPT_LAST_12.map((k) => (running += k));
})();

/**
 * 12-month view: income is INCOME every month, so spending = INCOME - kept.
 * "Your normal" is the average spending of the months before this one; a
 * month above it is flagged, the same rule benchmarks use per category.
 */
export const SPENDING_LAST_12 = KEPT_LAST_12.map((k) => INCOME - k);
export const NORMAL_MONTHLY_SPENDING = sum(SPENDING_LAST_12.slice(0, -1)) / (SPENDING_LAST_12.length - 1);
export const YEAR_TOTALS = {
  income: INCOME * KEPT_LAST_12.length,
  spending: sum(SPENDING_LAST_12),
  kept: sum(KEPT_LAST_12),
};

// ── View models (what each block renders; the test compares them) ────────────

/** HeroPreview */
export const HERO = {
  balance: BALANCE,
  kept: KEPT,
  spark: BALANCE_LAST_12,
  health: HEALTH,
  healthDelta: HEALTH_DELTA,
  budgets: topBudgets(3).map((c) => ({ ...c, pct: budgetPct(c) })),
  lastTx: { ...LAST_TX, iconKey: category(LAST_TX.category).iconKey },
};

/** Feature minis */
export const FEATURES = {
  score: { health: HEALTH, savingsRate: SAVINGS_RATE, budgetsKeptPct, goalsOnTrack },
  benchmarks: ['food', 'entertainment', 'shopping', 'transport'].map((k) => ({ ...category(k), pct: benchmarkPct(category(k)) })),
  forecast: ['food', 'entertainment', 'shopping', 'transport'].map((k) => {
    const c = category(k);
    const projected = forecast(c);
    return { ...c, pct: budgetPct(c), projected, exceedBy: projected - c.limit, willExceed: projected > c.limit };
  }),
  year: {
    months: LAST_12_MONTH_DATES.map((date, i) => ({
      date,
      spending: SPENDING_LAST_12[i],
      aboveNormal: SPENDING_LAST_12[i] > NORMAL_MONTHLY_SPENDING,
    })),
    max: Math.max(...SPENDING_LAST_12),
    totals: YEAR_TOTALS,
  },
};

// ── Formatting (one place, so "€412" reads the same everywhere) ──────────────

export const CURRENCY_SYMBOL = CURRENCY_SYMBOLS[CURRENCY] ?? CURRENCY;
export const money = (n, decimals = 0) => formatCurrency(n, CURRENCY, { decimals });
export const moneyK = (n) => `${CURRENCY_SYMBOL}${(n / 1000).toFixed(1)}k`;

if (import.meta.env?.DEV && KEPT_LAST_12.at(-1) !== KEPT) {
  throw new Error(`demoData: KEPT_LAST_12.at(-1) (${KEPT_LAST_12.at(-1)}) must equal KEPT (${KEPT})`);
}
