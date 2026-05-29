import { describe, it, expect } from 'vitest';
import { calculateMinEndDate, getMinEndDateString, validateRecurringEndDate, validateRecurringForm } from '../recurringValidation.js';
import { calculateNextDate } from '../api/recurring.js';

describe('calculateMinEndDate', () => {
  const START = '2025-01-15';

  it('adds interval days for daily frequency', () => {
    const result = calculateMinEndDate(START, 'daily', 1);
    expect(result.toISOString().split('T')[0]).toBe('2025-01-16');
  });

  it('adds multiple days for daily with intervalCount > 1', () => {
    const result = calculateMinEndDate(START, 'daily', 7);
    expect(result.toISOString().split('T')[0]).toBe('2025-01-22');
  });

  it('adds interval weeks for weekly frequency', () => {
    const result = calculateMinEndDate(START, 'weekly', 1);
    expect(result.toISOString().split('T')[0]).toBe('2025-01-22');
  });

  it('adds interval months for monthly frequency', () => {
    const result = calculateMinEndDate(START, 'monthly', 1);
    expect(result.toISOString().split('T')[0]).toBe('2025-02-15');
  });

  it('adds interval years for yearly frequency', () => {
    const result = calculateMinEndDate(START, 'yearly', 1);
    expect(result.toISOString().split('T')[0]).toBe('2026-01-15');
  });

  it('defaults intervalCount to 1 when NaN', () => {
    const result = calculateMinEndDate(START, 'daily', NaN);
    expect(result.toISOString().split('T')[0]).toBe('2025-01-16');
  });
});

describe('validateRecurringEndDate', () => {
  it('returns null when endDate or startDate is missing', () => {
    expect(validateRecurringEndDate('', '2025-01-15', 'monthly', 1)).toBeNull();
    expect(validateRecurringEndDate('2025-02-15', '', 'monthly', 1)).toBeNull();
  });

  it('returns endDateTooSoonError when end date is not past min date', () => {
    const error = validateRecurringEndDate('2026-08-23', '2026-08-23', 'monthly', 1);
    expect(error).toBe('recurring.endDateTooSoonError');
  });

  it('returns null for a valid end date after min interval', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];
    const today = new Date().toISOString().split('T')[0];
    const error = validateRecurringEndDate(futureDateStr, today, 'monthly', 1);
    expect(error).toBeNull();
  });
});

describe('validateRecurringForm', () => {
  it('returns intervalCount error when intervalCount is less than 1', () => {
    const errors = validateRecurringForm({ intervalCount: 0, frequency: 'monthly', endType: 'never', startDate: '2025-01-01' });
    expect(errors.intervalCount).toBe('recurring.intervalError');
  });

  it('returns no errors for valid never-ending recurring form', () => {
    const errors = validateRecurringForm({ intervalCount: 1, frequency: 'monthly', endType: 'never', startDate: '2025-01-01' });
    expect(Object.keys(errors)).toHaveLength(0);
  });

  it('returns endDate error when endType is date but no endDate provided', () => {
    const errors = validateRecurringForm({ intervalCount: 1, frequency: 'monthly', endType: 'date', endDate: '', startDate: '2025-01-01' });
    expect(errors.endDate).toBe('recurring.endDateError');
  });

  it('returns occurrencesLimit error when count is less than 2', () => {
    const errors = validateRecurringForm({ intervalCount: 1, frequency: 'monthly', endType: 'count', occurrencesLimit: 1, startDate: '2025-01-01' });
    expect(errors.occurrencesLimit).toBe('recurring.occurrencesMinError');
  });

  it('returns no errors for valid count-based recurring form', () => {
    const errors = validateRecurringForm({ intervalCount: 1, frequency: 'monthly', endType: 'count', occurrencesLimit: 5, startDate: '2025-01-01' });
    expect(errors.occurrencesLimit).toBeUndefined();
  });
});

describe('calculateNextDate (UTC)', () => {
  const utcDay = (iso) => new Date(iso).toISOString().split('T')[0];

  it('advances daily by interval', () => {
    expect(utcDay(calculateNextDate('2025-01-15', 'daily', 1))).toBe('2025-01-16');
    expect(utcDay(calculateNextDate('2025-01-15', 'daily', 7))).toBe('2025-01-22');
  });

  it('advances weekly by interval weeks', () => {
    expect(utcDay(calculateNextDate('2025-01-15', 'weekly', 1))).toBe('2025-01-22');
    expect(utcDay(calculateNextDate('2025-01-15', 'weekly', 2))).toBe('2025-01-29');
  });

  it('advances monthly preserving day-of-month', () => {
    expect(utcDay(calculateNextDate('2025-01-15', 'monthly', 1))).toBe('2025-02-15');
  });

  it('clamps monthly when target month has fewer days', () => {
    // Jan 31 + 1 month → Feb 28 (non-leap)
    expect(utcDay(calculateNextDate('2025-01-31', 'monthly', 1))).toBe('2025-02-28');
  });

  it('advances yearly preserving day-of-month', () => {
    expect(utcDay(calculateNextDate('2025-03-15', 'yearly', 1))).toBe('2026-03-15');
  });

  it('clamps yearly leap day to Feb 28 in non-leap year', () => {
    expect(utcDay(calculateNextDate('2024-02-29', 'yearly', 1))).toBe('2025-02-28');
  });

  it('is timezone-invariant: YYYY-MM-DD inputs treated as UTC midnight', () => {
    // This is the regression test for local-time math. Any TZ-sensitive impl
    // would shift this by a day in westward host TZs at month boundaries.
    expect(utcDay(calculateNextDate('2025-03-01', 'monthly', 1))).toBe('2025-04-01');
    expect(utcDay(calculateNextDate('2025-03-01', 'yearly', 1))).toBe('2026-03-01');
  });
});
