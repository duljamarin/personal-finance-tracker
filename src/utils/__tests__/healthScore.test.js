import { describe, it, expect } from 'vitest';
import { computeHealthScore } from '../finance/healthScore.js';

// Category ids
const FOOD = 'cat-food';
const RENT = 'cat-rent';
const categories = [{ id: FOOD }, { id: RENT }];

// Helper to build a tx
const tx = (type, cat, amount, date) => ({
  type,
  category_id: cat,
  amount,
  base_amount: amount, // EUR already
  exchange_rate: 1,
  date,
});

describe('computeHealthScore', () => {
  it('reports totals and positive savings for a simple month', () => {
    const month = '2026-07-01';
    const txs = [
      tx('income', null, 2000, '2026-07-03'),
      tx('expense', FOOD, 400, '2026-07-10'),
      tx('expense', RENT, 600, '2026-07-01'),
    ];
    const r = computeHealthScore(txs, categories, month);

    expect(r.totalIncome).toBe(2000);
    expect(r.totalExpenses).toBe(1000);
    expect(r.savingsAmount).toBe(1000);
    // ratio = 0.5 → ratioScore 100
    expect(r.incomeExpenseRatioScore).toBe(100);
    // positive savings insight present
    const ie = r.insights.find((i) => i.type === 'income_expense');
    expect(ie.status).toBe('positive');
    expect(ie.savings).toBe(1000);
    expect(ie.savingsPercent).toBe(50);
  });

  it('scores overspending (no income) at ratio 20', () => {
    const month = '2026-07-01';
    const txs = [tx('expense', FOOD, 500, '2026-07-05')];
    const r = computeHealthScore(txs, categories, month);
    expect(r.totalIncome).toBe(0);
    expect(r.totalExpenses).toBe(500);
    expect(r.incomeExpenseRatioScore).toBe(20);
    const ie = r.insights.find((i) => i.type === 'income_expense');
    expect(ie.status).toBe('no_income');
  });

  it('flags a category as over budget vs its 6-month average', () => {
    const month = '2026-07-01';
    const txs = [
      // prior 6 months of FOOD at ~100/mo
      tx('expense', FOOD, 100, '2026-01-15'),
      tx('expense', FOOD, 100, '2026-02-15'),
      tx('expense', FOOD, 100, '2026-03-15'),
      // current month FOOD blows up to 500 (> avg * 1.1)
      tx('expense', FOOD, 500, '2026-07-10'),
      tx('income', null, 3000, '2026-07-01'),
    ];
    const r = computeHealthScore(txs, categories, month);
    expect(r.categoriesOverBudget).toBe(1);
    expect(r.categoriesWithinBudget).toBe(0);
    const budget = r.insights.find((i) => i.type === 'budget');
    expect(budget.status).toBe('one_over');
  });

  it('produces a bounded 0-100 total score', () => {
    const month = '2026-07-01';
    const txs = [
      tx('income', null, 5000, '2026-07-01'),
      tx('expense', FOOD, 100, '2026-07-05'),
    ];
    const r = computeHealthScore(txs, categories, month);
    expect(r.totalScore).toBeGreaterThanOrEqual(0);
    expect(r.totalScore).toBeLessThanOrEqual(100);
  });

  it('breaking-even savings insight when income equals expenses', () => {
    const month = '2026-07-01';
    const txs = [
      tx('income', null, 1000, '2026-07-01'),
      tx('expense', RENT, 1000, '2026-07-02'),
    ];
    const r = computeHealthScore(txs, categories, month);
    expect(r.savingsAmount).toBe(0);
    const savings = r.insights.find((i) => i.type === 'savings');
    expect(savings.status).toBe('breaking_even');
  });
});
