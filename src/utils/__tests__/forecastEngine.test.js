import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { computeForecast, UNCATEGORIZED } from '../finance/forecast/forecastEngine';
import { toISODate } from '../date';

// Fixed "today": 18 Nov 2026 (30-day month): 18 days elapsed, 12 remaining.
const TODAY = '2026-11-18';
const config = { LOOKBACK_MONTHS: 3, CONFIDENCE_FULL_MONTHS: 3, EARLY_MONTH_DAYS: 7 };

let seq = 0;
const tx = (date, type, amount, extra = {}) => ({
  id: `t${++seq}`, date, type, amount, base_amount: amount, exchange_rate: 1, category_id: 'food', source_recurring_id: null, ...extra,
});
const rule = (id, extra = {}) => ({
  id, is_active: true, type: 'expense', amount: 0, exchange_rate: 1, category_id: 'housing', title: id,
  frequency: 'monthly', interval_count: 1, start_date: '2026-01-01', next_run_at: '2026-12-01T00:00:00Z',
  occurrences_created: 0, end_date: null, occurrences_limit: null, ...extra,
});

// History (Aug-Oct): salary and rent from recurring rules, everyday spending.
const history = () => [
  tx('2026-08-01', 'income', 3000, { category_id: 'salary', source_recurring_id: 'salary' }),
  tx('2026-08-01', 'expense', 650, { category_id: 'housing', source_recurring_id: 'rent' }),
  tx('2026-08-10', 'expense', 300, { category_id: 'food' }),
  tx('2026-08-20', 'expense', 100, { category_id: 'fun' }),
  tx('2026-09-01', 'income', 3000, { category_id: 'salary', source_recurring_id: 'salary' }),
  tx('2026-09-01', 'expense', 650, { category_id: 'housing', source_recurring_id: 'rent' }),
  tx('2026-09-12', 'expense', 360, { category_id: 'food' }),
  tx('2026-09-25', 'expense', 90, { category_id: 'fun' }),
  tx('2026-10-01', 'income', 3000, { category_id: 'salary', source_recurring_id: 'salary' }),
  tx('2026-10-01', 'expense', 650, { category_id: 'housing', source_recurring_id: 'rent' }),
  tx('2026-10-08', 'expense', 330, { category_id: 'food' }),
  tx('2026-10-22', 'expense', 120, { category_id: 'fun' }),
];

// This month: posted rent + salary, everyday spending (one split, one
// uncategorized), a manual future-dated expense.
const thisMonth = () => [
  tx('2026-11-01', 'income', 3000, { category_id: 'salary', source_recurring_id: 'salary' }),
  tx('2026-11-01', 'expense', 650, { category_id: 'housing', source_recurring_id: 'rent' }),
  tx('2026-11-05', 'expense', 120, { category_id: 'food' }),
  tx('2026-11-09', 'expense', 80, { category_id: null, has_splits: true, splits: [{ category_id: 'food', amount: 50 }, { category_id: 'fun', amount: 30 }] }),
  tx('2026-11-12', 'expense', 40, { category_id: null }),
  tx('2026-11-25', 'expense', 200, { category_id: 'fun' }),
];

const recurringRules = () => [
  rule('rent', { amount: 650, category_id: 'housing' }),
  rule('salary', { type: 'income', amount: 3000, category_id: 'salary' }),
  rule('gym', { amount: 20, category_id: 'fun', frequency: 'weekly', start_date: '2026-10-02', next_run_at: '2026-11-20T00:00:00Z' }),
  // Due on the 15th but not posted yet (processing has not run).
  rule('netflix', { amount: 12, category_id: 'fun', start_date: '2026-06-15', next_run_at: '2026-11-15T00:00:00Z' }),
];

const budgets = [
  { category_id: 'food', amount: 300 },
  { category_id: 'fun', amount: 250 },
  { category_id: 'housing', amount: 650 },
];

// Built once so ids are stable across computeForecast calls.
const HISTORY = history();
const THIS_MONTH = thisMonth();
const RULES = recurringRules();

const base = (over = {}) => computeForecast({
  today: TODAY, transactions: [...HISTORY, ...THIS_MONTH], recurring: RULES, budgets, config, ...over,
});

describe('forecastEngine: values', () => {
  it('classifies actual, scheduled and everyday spending', () => {
    const f = base();
    expect(f.DAYS_ELAPSED).toBe(18);
    expect(f.DAYS_REMAINING).toBe(12);
    expect(f.ACTUAL_INCOME).toBe(3000);
    expect(f.ACTUAL_EXPENSE).toBe(650 + 120 + 80 + 40);
    // gym 20 + 27 Nov, netflix (due 15th, not posted), manual fun on the 25th
    expect(f.SCHEDULED.map((x) => `${x.source === 'recurring' ? x.id : 'entry'}@${x.date}`))
      .toEqual(['netflix@2026-11-15', 'gym@2026-11-20', 'entry@2026-11-25', 'gym@2026-11-27']);
    expect(f.SCHEDULED_EXPENSE).toBe(12 + 20 + 200 + 20);
    expect(f.SCHEDULED.find((s) => s.id === 'netflix').due).toBe(true);
    expect(f.DISCRETIONARY).toBe(120 + 80 + 40);
    expect(f.CURRENT_RATE).toBe(240 / 18);
    expect(f.HISTORY_MONTHS).toBe(3);
    expect(f.CONFIDENCE).toBe('high');
  });

  it('PROJECTED_EXPENSE equals ACTUAL + SCHEDULED + DISCRETIONARY_REMAINING', () => {
    const f = base();
    expect(f.PROJECTED_EXPENSE).toBeCloseTo(f.ACTUAL_EXPENSE + f.SCHEDULED_EXPENSE + f.DISCRETIONARY_REMAINING, 9);
    expect(f.BLENDED_RATE).toBeCloseTo(f.WEIGHT * f.CURRENT_RATE + (1 - f.WEIGHT) * f.HIST_RATE, 12);
  });

  it('splits count toward their categories; uncategorized gets its own bucket', () => {
    const f = base();
    const byId = Object.fromEntries(f.CATEGORIES.map((c) => [String(c.categoryId), c]));
    expect(byId.food.ACTUAL_EXPENSE).toBe(120 + 50);
    expect(byId.fun.ACTUAL_EXPENSE).toBe(30);
    expect(byId[String(UNCATEGORIZED)].ACTUAL_EXPENSE).toBe(40);
  });

  it('budgets: overspend per category, sorted by overspend', () => {
    const f = base();
    for (const c of f.BUDGETED_CATEGORIES) expect(c.PROJECTED_OVERSPEND).toBe(Math.max(0, c.PROJECTED_EXPENSE - c.BUDGET));
    const overs = f.BUDGETED_CATEGORIES.map((c) => c.PROJECTED_OVERSPEND);
    expect([...overs].sort((a, b) => b - a)).toEqual(overs);
    expect(f.BUDGETED_CATEGORIES.map((c) => c.categoryId).sort()).toEqual(['food', 'fun', 'housing']);
  });

  it('early-month note before EARLY_MONTH_DAYS', () => {
    expect(base({ today: '2026-11-06' }).IS_EARLY_MONTH).toBe(true);
    expect(base({ today: '2026-11-07' }).IS_EARLY_MONTH).toBe(false);
  });
});

describe('forecastEngine: invariants', () => {
  const fixtures = {
    base: () => base(),
    heavyThisMonth: () => base({ transactions: [...HISTORY, ...THIS_MONTH, tx('2026-11-17', 'expense', 900, { category_id: 'food' })] }),
    quietThisMonth: () => base({ transactions: [...HISTORY, ...THIS_MONTH.slice(0, 2)] }),
    noHistory: () => base({ transactions: THIS_MONTH }),
  };

  it('1. PROJECTED_NET === PROJECTED_INCOME - PROJECTED_EXPENSE', () => {
    for (const make of Object.values(fixtures)) {
      const f = make();
      expect(f.PROJECTED_NET).toBe(f.PROJECTED_INCOME - f.PROJECTED_EXPENSE);
    }
  });

  it('2. PESSIMISTIC_NET <= PROJECTED_NET <= OPTIMISTIC_NET', () => {
    for (const make of Object.values(fixtures)) {
      const f = make();
      expect(f.PESSIMISTIC_NET).toBeLessThanOrEqual(f.PROJECTED_NET);
      expect(f.PROJECTED_NET).toBeLessThanOrEqual(f.OPTIMISTIC_NET);
    }
  });

  it('3. on the last day: nothing remains, net = actual income - actual expense', () => {
    const lastDay = base({
      today: '2026-11-30',
      transactions: [...HISTORY, ...THIS_MONTH],
      recurring: RULES.filter((r) => r.id === 'rent' || r.id === 'salary'),
    });
    expect(lastDay.DAYS_REMAINING).toBe(0);
    expect(lastDay.SCHEDULED).toEqual([]);
    expect(lastDay.DISCRETIONARY_REMAINING).toBe(0);
    expect(lastDay.PROJECTED_NET).toBe(lastDay.ACTUAL_INCOME - lastDay.ACTUAL_EXPENSE);
  });

  it('4. categories add up to PROJECTED_EXPENSE exactly (uncategorized included)', () => {
    for (const make of Object.values(fixtures)) {
      const f = make();
      const total = f.CATEGORIES.reduce((s, c) => s + c.PROJECTED_EXPENSE, 0);
      expect(total).toBe(f.PROJECTED_EXPENSE);
    }
    // The 40 without a category is its own bucket, not lost.
    expect(base().CATEGORIES.find((c) => c.categoryId === UNCATEGORIZED).ACTUAL_EXPENSE).toBe(40);
  });

  it('5. an occurrence already posted counts once, in ACTUAL', () => {
    const posted = tx('2026-11-15', 'expense', 12, { category_id: 'fun', source_recurring_id: 'netflix' });
    const f = base({ transactions: [...HISTORY, ...THIS_MONTH, posted] });
    expect(f.SCHEDULED.some((s) => s.id === 'netflix')).toBe(false);
    expect(f.ACTUAL_EXPENSE).toBe(base().ACTUAL_EXPENSE + 12);
    expect(f.SCHEDULED_EXPENSE).toBe(base().SCHEDULED_EXPENSE - 12);
  });

  it('6. rent posted on day 1 by a recurring rule does not move CURRENT_RATE', () => {
    const withoutRent = base({ transactions: [...HISTORY, ...THIS_MONTH.filter((t) => t.source_recurring_id !== 'rent')] });
    expect(base().CURRENT_RATE).toBe(withoutRent.CURRENT_RATE);
  });

  it('7. one huge purchase in one past month: HIST_RATE is the middle month', () => {
    const f = base({
      transactions: [
        tx('2026-08-10', 'expense', 300), // 300 / 31
        tx('2026-09-10', 'expense', 9000), // outlier
        tx('2026-10-10', 'expense', 330), // 330 / 31
        ...THIS_MONTH,
      ],
    });
    expect(f.HISTORY_MONTHS).toBe(3);
    expect(f.HIST_RATE).toBe(330 / 31);
  });

  it('8. no history: HIST = CURRENT, low confidence, one value for all three nets', () => {
    const f = fixtures.noHistory();
    expect(f.HISTORY_MONTHS).toBe(0);
    expect(f.HIST_RATE).toBe(f.CURRENT_RATE);
    expect(f.CONFIDENCE).toBe('low');
    expect(f.PESSIMISTIC_NET).toBe(f.PROJECTED_NET);
    expect(f.OPTIMISTIC_NET).toBe(f.PROJECTED_NET);
  });

  it('9. every frequency (incl. starting / ending mid-month) is counted in SCHEDULED', () => {
    const only = (r) => computeForecast({ today: TODAY, transactions: [], recurring: [r], budgets: [], config });
    const count = (extra) => only(rule('x', { amount: 10, ...extra })).SCHEDULED_COUNT;
    expect(count({ frequency: 'daily', next_run_at: '2026-11-19' })).toBe(12);
    expect(count({ frequency: 'weekly', next_run_at: '2026-11-20' })).toBe(2);
    expect(count({ frequency: 'monthly', next_run_at: '2026-11-25' })).toBe(1);
    expect(count({ frequency: 'monthly', next_run_at: '2026-12-01' })).toBe(0);
    expect(count({ frequency: 'yearly', start_date: '2025-11-28', next_run_at: '2026-11-28' })).toBe(1);
    expect(count({ frequency: 'yearly', start_date: '2026-03-28', next_run_at: '2027-03-28' })).toBe(0);
    expect(count({ frequency: 'weekly', start_date: '2026-11-22', next_run_at: '2026-11-22' })).toBe(2);
    expect(count({ frequency: 'daily', next_run_at: '2026-11-19', end_date: '2026-11-23' })).toBe(5);
    expect(count({ frequency: 'daily', next_run_at: '2026-11-19', occurrences_limit: 5, occurrences_created: 3 })).toBe(2);
    expect(count({ frequency: 'weekly', interval_count: 2, next_run_at: '2026-11-20' })).toBe(1);
    expect(count({ frequency: 'daily', next_run_at: '2026-11-19', is_active: false })).toBe(0);
  });

  describe('10. time zone', () => {
    let saved;
    beforeAll(() => { saved = process.env.TZ; process.env.TZ = 'America/New_York'; });
    afterAll(() => { process.env.TZ = saved; });

    it('23:30 local on the last day is still that day', () => {
      const lateEvening = new Date(2026, 10, 30, 23, 30);
      expect(lateEvening.toISOString().slice(0, 10)).toBe('2026-12-01'); // the UTC trap
      const today = toISODate(lateEvening); // what useMonthForecast passes in
      expect(today).toBe('2026-11-30');
      const f = base({ today });
      expect(f.MONTH_END).toBe('2026-11-30');
      expect(f.DAYS_REMAINING).toBe(0);
    });
  });

  it('11. LOOKBACK_MONTHS only moves the history-based outputs', () => {
    const a = base();
    const b = base({ config: { ...config, LOOKBACK_MONTHS: 2 } });
    for (const key of ['ACTUAL_INCOME', 'ACTUAL_EXPENSE', 'SCHEDULED_INCOME', 'SCHEDULED_EXPENSE', 'SCHEDULED', 'CURRENT_RATE']) {
      expect(b[key]).toEqual(a[key]);
    }
    expect(b.HISTORY_MONTHS).toBe(2);
    expect(b.HIST_RATE).not.toBe(a.HIST_RATE);
  });

  it('12. other transaction types change nothing', () => {
    const noise = [
      tx('2026-11-10', 'transfer', 5000, { category_id: 'food' }),
      tx('2026-10-10', 'transfer', 5000, { category_id: 'food' }),
    ];
    const noisyRules = [...RULES, rule('move', { type: 'transfer', amount: 999, next_run_at: '2026-11-20' })];
    expect(base({ transactions: [...HISTORY, ...THIS_MONTH, ...noise], recurring: noisyRules })).toEqual(base());
  });
});
