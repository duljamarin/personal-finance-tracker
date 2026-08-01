import { describe, it, expect } from 'vitest';

// First-run regression: CategoryBenchmark filtered rows to `months_with_data > 0`
// and rendered only those, so a user in their first month saw an empty section
// even though computeCategoryBenchmarks had already returned their spending
// (status 'new', months_with_data 0). These pin the selection rule.

// Mirrors the logic in CategoryBenchmark.jsx.
function selectVisible(benchmarks) {
  const withHistory = benchmarks.filter((b) => b.months_with_data > 0);
  const hasAnyHistory = withHistory.length > 0;
  return {
    hasAnyHistory,
    visible: hasAnyHistory
      ? withHistory
      : [...benchmarks]
          .filter((b) => Number(b.current_month_spending) > 0)
          .sort((a, b) => Number(b.current_month_spending) - Number(a.current_month_spending)),
  };
}

const row = (over) => ({
  category_id: 'c',
  category_name: 'Cat',
  months_with_data: 0,
  current_month_spending: 0,
  avg_monthly_spending: 0,
  status: 'new',
  ...over,
});

describe('first run: no category has history', () => {
  const benchmarks = [
    row({ category_id: 'food', category_name: 'Food', current_month_spending: 120 }),
    row({ category_id: 'rent', category_name: 'Rent', current_month_spending: 800 }),
    row({ category_id: 'fun', category_name: 'Fun', current_month_spending: 40 }),
  ];

  it('shows the categories instead of hiding everything', () => {
    const { visible } = selectVisible(benchmarks);
    expect(visible).toHaveLength(3);
  });

  it('reports that no baseline exists yet', () => {
    expect(selectVisible(benchmarks).hasAnyHistory).toBe(false);
  });

  it('orders by spend so the biggest categories lead', () => {
    const names = selectVisible(benchmarks).visible.map((b) => b.category_name);
    expect(names).toEqual(['Rent', 'Food', 'Fun']);
  });

  it('omits categories with nothing spent this month', () => {
    const withZero = [...benchmarks, row({ category_id: 'z', category_name: 'Zero', current_month_spending: 0 })];
    const names = selectVisible(withZero).visible.map((b) => b.category_name);
    expect(names).not.toContain('Zero');
  });
});

describe('once history exists', () => {
  const benchmarks = [
    row({ category_id: 'food', category_name: 'Food', months_with_data: 3, current_month_spending: 120, status: 'within' }),
    row({ category_id: 'new', category_name: 'Brand new', current_month_spending: 500 }),
  ];

  it('shows only rows that can actually be compared', () => {
    // A no-history row alongside real baselines would show "no baseline yet"
    // next to real comparisons; the established rows are the useful signal.
    const names = selectVisible(benchmarks).visible.map((b) => b.category_name);
    expect(names).toEqual(['Food']);
  });

  it('reports that a baseline exists', () => {
    expect(selectVisible(benchmarks).hasAnyHistory).toBe(true);
  });
});

describe('genuinely empty', () => {
  it('shows nothing when there are no categories at all', () => {
    expect(selectVisible([]).visible).toHaveLength(0);
  });

  it('shows nothing when every category spent zero', () => {
    const { visible } = selectVisible([row({ current_month_spending: 0 })]);
    expect(visible).toHaveLength(0);
  });
});
