import { describe, it, expect } from 'vitest';
import { baseAmountOf, monthKey, stdDevPop, avg, round2 } from '../finance/shared.js';

describe('baseAmountOf', () => {
  it('prefers base_amount when present', () => {
    expect(baseAmountOf({ base_amount: 42.5, amount: 10, exchange_rate: 2 })).toBe(42.5);
  });

  it('falls back to amount * exchange_rate', () => {
    expect(baseAmountOf({ base_amount: null, amount: 10, exchange_rate: 1.5 })).toBe(15);
  });

  it('defaults exchange_rate to 1.0 when missing', () => {
    expect(baseAmountOf({ amount: 10 })).toBe(10);
  });

  it('handles base_amount of 0 as a valid value', () => {
    expect(baseAmountOf({ base_amount: 0, amount: 99 })).toBe(0);
  });
});

describe('monthKey', () => {
  it('extracts YYYY-MM from a date string', () => {
    expect(monthKey('2026-07-05')).toBe('2026-07');
  });
});

describe('stdDevPop', () => {
  it('returns 0 for a single value', () => {
    expect(stdDevPop([5])).toBe(0);
  });

  it('computes population standard deviation', () => {
    // values [2,4,4,4,5,5,7,9] → mean 5, pop stddev 2
    expect(stdDevPop([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10);
  });

  it('returns 0 for empty input', () => {
    expect(stdDevPop([])).toBe(0);
  });
});

describe('avg', () => {
  it('averages values', () => {
    expect(avg([10, 20, 30])).toBe(20);
  });
  it('returns 0 for empty', () => {
    expect(avg([])).toBe(0);
  });
});

describe('round2', () => {
  it('rounds to 2 decimals', () => {
    expect(round2(1.005)).toBe(1.01);
    expect(round2(2.344)).toBe(2.34);
  });
});
