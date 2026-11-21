import {
  monthTotals, keptSeries, balanceSeries, categoryStack, activityRows,
  groupByDay, upcomingRecurring, daysUntil,
  savingRate, budgetsKept, goalOnTrack, goalsOnTrack, spendingNormal,
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

  it('saving rate is kept / income in whole percent, null without income', () => {
    expect(savingRate({ income: 3800, expense: 1402 })).toBe(63);
    expect(savingRate({ income: 1000, expense: 1200 })).toBe(-20);
    expect(savingRate({ income: 0, expense: 50 })).toBeNull();
  });

  it('budgets kept counts spend at or under the limit, ignoring zero limits', () => {
    const budgets = [
      { category_id: 'a', amount: 650 },
      { category_id: 'b', amount: 600 },
      { category_id: 'c', amount: 100 },
      { category_id: 'd', amount: 0 },
    ];
    expect(budgetsKept(budgets, { a: 650, b: 412, c: 137 })).toEqual({ kept: 2, total: 3, pct: 67 });
    expect(budgetsKept([], {})).toEqual({ kept: 0, total: 0, pct: null });
  });

  it('a goal is on track when saved share >= time share toward its date', () => {
    const now = new Date('2026-07-01T00:00:00');
    const base = { target_amount: 1000, created_at: '2026-01-01T00:00:00', target_date: '2026-12-31' };
    expect(goalOnTrack({ ...base, current_amount: 600 }, now)).toBe(true);   // ~50% of time, 60% saved
    expect(goalOnTrack({ ...base, current_amount: 300 }, now)).toBe(false);  // behind pace
    expect(goalOnTrack({ ...base, current_amount: 300, target_date: '2026-06-01' }, now)).toBe(false); // past date
    expect(goalOnTrack({ ...base, current_amount: 1000, target_date: '2026-06-01' }, now)).toBe(true); // reached
    expect(goalOnTrack({ target_amount: 1000, current_amount: 0 }, now)).toBe(false);  // no date, not started
    expect(goalOnTrack({ target_amount: 1000, current_amount: 50 }, now)).toBe(true);  // no date, being funded
  });

  it('goals on track counts active goals still in progress', () => {
    const now = new Date('2026-07-01T00:00:00');
    const goals = [
      { target_amount: 1000, current_amount: 50 },
      { target_amount: 1000, current_amount: 0 },
      { target_amount: 1000, current_amount: 1000, is_completed: true },
      { target_amount: 1000, current_amount: 500, is_active: false },
    ];
    expect(goalsOnTrack(goals, now)).toEqual({ onTrack: 1, total: 2 });
  });

  it('spending normal: mean of complete months before now, benchmark band, current month excluded', () => {
    const now = new Date('2026-11-18T12:00:00');
    const txs = [
      tx('2026-08-10', 'expense', 1000),
      tx('2026-09-10', 'expense', 1200),
      tx('2026-10-10', 'expense', 1400),
      tx('2026-10-11', 'income', 5000),
      tx('2026-11-02', 'expense', 9000), // current month: not part of normal
    ];
    const n = spendingNormal(txs, now);
    expect(n.avg).toBe(1200);
    expect(n.upper).toBeCloseTo(1200 + Math.sqrt((200 ** 2 + 0 + 200 ** 2) / 3), 6);
    expect(n.months).toBe(3);
    expect(spendingNormal([tx('2026-11-02', 'expense', 50)], now)).toBeNull();
    // identical months: band is 20% of the mean
    expect(spendingNormal([tx('2026-09-01', 'expense', 500), tx('2026-10-01', 'expense', 500)], now).upper).toBe(600);
  });
});
