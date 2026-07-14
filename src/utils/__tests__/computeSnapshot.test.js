import { describe, it, expect } from 'vitest';
import { computeSnapshot, referenceBucket } from '../reveal/computeSnapshot.js';

describe('referenceBucket', () => {
  it('maps rent/qira to housing', () => {
    expect(referenceBucket('Rent')).toBe('housing');
    expect(referenceBucket('Qiraja')).toBe('housing');
  });
  it('maps food/ushqim to food', () => {
    expect(referenceBucket('Groceries')).toBe('food');
    expect(referenceBucket('Ushqim')).toBe('food');
  });
  it('falls back to other', () => {
    expect(referenceBucket('Gym membership')).toBe('other');
  });
});

describe('computeSnapshot', () => {
  it('computes savings, rate, and projections for a positive month', () => {
    const s = computeSnapshot({
      income: 3000,
      bills: [{ amount: 800, categoryName: 'Rent' }, { amount: 400, categoryName: 'Food' }],
    });
    expect(s.totalBills).toBe(1200);
    expect(s.monthlySavings).toBe(1800);
    expect(s.savingsRate).toBeCloseTo(0.6, 5);
    expect(s.projectedAnnual).toBe(1800 * 12);
    expect(s.positive).toBe(true);
    expect(s.hasIncome).toBe(true);
    expect(s.score).toBeGreaterThanOrEqual(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it('flags negative savings when bills exceed income', () => {
    const s = computeSnapshot({
      income: 1000,
      bills: [{ amount: 1200, categoryName: 'Rent' }],
    });
    expect(s.monthlySavings).toBe(-200);
    expect(s.positive).toBe(false);
  });

  it('surfaces the biggest opportunity vs reference shares', () => {
    // Rent is 50% of income (ref 30%) → over by 20% → biggest opportunity
    const s = computeSnapshot({
      income: 2000,
      bills: [
        { amount: 1000, categoryName: 'Rent' },
        { amount: 200, categoryName: 'Food' },
      ],
    });
    expect(s.opportunity).not.toBeNull();
    expect(s.opportunity.bucket).toBe('housing');
    expect(s.opportunity.potentialMonthly).toBeCloseTo(0.2 * 2000, 5); // 400/mo
    expect(s.opportunity.potentialAnnual).toBeCloseTo(0.2 * 2000 * 12, 5);
  });

  it('degrades gracefully with no income', () => {
    const s = computeSnapshot({ income: 0, bills: [{ amount: 500, categoryName: 'Food' }] });
    expect(s.hasIncome).toBe(false);
    expect(s.score).toBe(0);
    expect(s.opportunity).toBeNull();
    expect(s.savingsRate).toBe(0);
  });

  it('does NOT award a perfect score for income with no bills entered', () => {
    // Regression: a fresh user who sets income but skips expenses used to score
    // 100 (savingsRate=100% maxed every component). We now cap at a baseline.
    const s = computeSnapshot({ income: 3000, bills: [] });
    expect(s.hasIncome).toBe(true);
    expect(s.totalBills).toBe(0);
    expect(s.score).toBeLessThan(100);
    expect(s.score).toBe(60);
  });

  it('rewards a healthy savings rate with a strong (but earned) score', () => {
    // 25% savings, fixed costs 75% of income.
    const s = computeSnapshot({
      income: 4000,
      bills: [{ amount: 3000, categoryName: 'Rent' }],
    });
    expect(s.score).toBeGreaterThan(0);
    expect(s.score).toBeLessThanOrEqual(100);
  });

  it('computes a positive safe-to-spend per day with a payday', () => {
    const s = computeSnapshot({
      income: 3000,
      bills: [{ amount: 1500, categoryName: 'Rent' }],
      payday: 28,
    });
    expect(s.safeToSpendPerDay).toBeGreaterThan(0);
    expect(s.daysUntilPayday).toBeGreaterThanOrEqual(1);
  });
});
