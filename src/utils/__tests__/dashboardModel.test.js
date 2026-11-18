import {
  monthTotals, keptSeries, balanceSeries, categoryStack, activityRows,
  groupByDay, upcomingRecurring, daysUntil, healthPoints,
} from '../finance/dashboardModel';

const tx = (date, type, amount, extra = {}) => ({ id: `${date}-${type}-${amount}`, date, type, amount, base_amount: amount, ...extra });

describe('dashboardModel', () => {
  const now = new Date(2026, 10, 18); // 18 Nov 2026
  const nov = new Date(2026, 10, 1);
  const data = [
    tx('2026-11-17', 'expense', 50),
    tx('2026-11-02', 'income', 1000),
    tx('2026-10-10', 'expense', 200),
    tx('2026-10-25', 'expense', 300), // after day 18: excluded from the prev span
    tx('2026-03-01', 'income', 400),
  ];

  it('month totals compare the same day-span of last month', () => {
    const m = monthTotals(data, nov, now);
    expect(m).toMatchObject({ income: 1000, expense: 50, prevExpense: 200, hasPrev: true, count: 2 });
  });

  it('kept and balance series end at the selected month and agree with the KPI', () => {
    const kept = keptSeries(data, nov, 6);
    expect(kept.map((k) => k.key)).toEqual(['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']);
    expect(kept.at(-1).kept).toBe(950);
    const bal = balanceSeries(data, nov, 8);
    const total = data.reduce((s, t) => s + (t.type === 'income' ? t.amount : -t.amount), 0);
    expect(bal.at(-1).balance).toBe(total);
    expect(bal[0].balance).toBe(400); // opening (March income) carried in
  });

  it('category stack keeps the top N and groups the rest', () => {
    const { head, other } = categoryStack({ a: 10, b: 30, c: 5, d: 0 }, [{ id: 'a', name: 'A' }], 2);
    expect(head.map((h) => h.id)).toEqual(['b', 'a']);
    expect(other).toBe(5);
  });

  it('activity rows are the last 7 days, capped, filtered', () => {
    const rows = activityRows(data, nov, { now });
    expect(rows.map((r) => r.date)).toEqual(['2026-11-17']);
    expect(activityRows(data, nov, { now, days: 30, filter: 'income' }).map((r) => r.type)).toEqual(['income']);
    const many = Array.from({ length: 12 }, (_, i) => tx('2026-11-18', 'expense', i + 1));
    expect(activityRows(many, nov, { now })).toHaveLength(8);
  });

  it('groups by day with a net total', () => {
    const g = groupByDay([tx('2026-11-17', 'expense', 5), tx('2026-11-17', 'income', 20), tx('2026-11-16', 'expense', 1)]);
    expect(g.map((x) => [x.day, x.net])).toEqual([['2026-11-17', 15], ['2026-11-16', -1]]);
  });

  it('upcoming recurring: active, future, sorted, top 3', () => {
    const r = upcomingRecurring([
      { id: 1, is_active: true, next_run_at: '2026-12-01' },
      { id: 2, is_active: true, next_run_at: '2026-11-22' },
      { id: 3, is_active: false, next_run_at: '2026-11-19' },
      { id: 4, is_active: true, next_run_at: '2026-11-10' },
    ], { now });
    expect(r.map((x) => x.id)).toEqual([2, 1]);
    expect(r[0].inDays).toBe(4);
    expect(daysUntil('2026-11-18', now)).toBe(0);
  });

  it('health points are weighted and sum to the total', () => {
    const score = { budgetAdherenceScore: 100, incomeExpenseRatioScore: 50, spendingVolatilityScore: 100, savingsConsistencyScore: 0 };
    const pts = healthPoints(score);
    expect(pts.map((p) => `${p.points}/${p.weight}`)).toEqual(['40/40', '15/30', '20/20', '0/10']);
    expect(pts.reduce((s, p) => s + p.points, 0)).toBe(75);
  });
});
