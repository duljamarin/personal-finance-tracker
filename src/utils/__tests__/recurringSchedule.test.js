import { describe, it, expect } from 'vitest';
import { calculateNextDate, occurrencesInRange } from '../finance/recurringSchedule';

const rule = (extra = {}) => ({
  id: 'r', frequency: 'monthly', interval_count: 1, start_date: '2026-01-15',
  next_run_at: '2026-11-15T00:00:00Z', occurrences_created: 0, end_date: null, occurrences_limit: null, ...extra,
});

describe('occurrencesInRange (the one schedule walk)', () => {
  // Invariant 9: every frequency in recurring_transactions.frequency.
  it('daily: every day from the next run', () => {
    const r = rule({ frequency: 'daily', next_run_at: '2026-11-19T00:00:00Z' });
    const { dates } = occurrencesInRange(r, '2026-11-01', '2026-11-30');
    expect(dates).toHaveLength(12);
    expect(dates[0]).toBe('2026-11-19');
    expect(dates.at(-1)).toBe('2026-11-30');
  });

  it('weekly, and every 2 weeks', () => {
    expect(occurrencesInRange(rule({ frequency: 'weekly', next_run_at: '2026-11-06' }), '2026-11-01', '2026-11-30').dates)
      .toEqual(['2026-11-06', '2026-11-13', '2026-11-20', '2026-11-27']);
    expect(occurrencesInRange(rule({ frequency: 'weekly', interval_count: 2, next_run_at: '2026-11-06' }), '2026-11-01', '2026-11-30').dates)
      .toEqual(['2026-11-06', '2026-11-20']);
  });

  it('monthly: once, and month-end anchors clamp then recover', () => {
    expect(occurrencesInRange(rule(), '2026-11-01', '2026-11-30').dates).toEqual(['2026-11-15']);
    const endOfMonth = rule({ start_date: '2026-01-31', next_run_at: '2026-01-31' });
    expect(occurrencesInRange(endOfMonth, '2026-01-01', '2026-04-30').dates)
      .toEqual(['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  it('yearly: only in its month', () => {
    const r = rule({ frequency: 'yearly', start_date: '2025-11-28', next_run_at: '2026-11-28' });
    expect(occurrencesInRange(r, '2026-11-01', '2026-11-30').dates).toEqual(['2026-11-28']);
    expect(occurrencesInRange(r, '2026-12-01', '2027-10-31').dates).toEqual([]);
  });

  it('starting mid-month (no run yet: walks from start_date)', () => {
    const r = rule({ frequency: 'weekly', start_date: '2026-11-22', next_run_at: null });
    expect(occurrencesInRange(r, '2026-11-01', '2026-11-30').dates).toEqual(['2026-11-22', '2026-11-29']);
  });

  it('ending mid-month: stops at end_date and reports the schedule ended', () => {
    const r = rule({ frequency: 'daily', next_run_at: '2026-11-19', end_date: '2026-11-23' });
    const out = occurrencesInRange(r, '2026-11-01', '2026-11-30');
    expect(out.dates).toEqual(['2026-11-19', '2026-11-20', '2026-11-21', '2026-11-22', '2026-11-23']);
    expect(out.exhausted).toBe(true);
  });

  it('occurrences_limit counts from occurrences_created', () => {
    const r = rule({ frequency: 'daily', next_run_at: '2026-11-19', occurrences_limit: 5, occurrences_created: 3 });
    const out = occurrencesInRange(r, '2026-11-01', '2026-11-30');
    expect(out.dates).toEqual(['2026-11-19', '2026-11-20']);
    expect(out.exhausted).toBe(true);
  });

  it('from = null returns everything due from the next run (generator use) and the next date', () => {
    const out = occurrencesInRange(rule({ next_run_at: '2026-09-15' }), null, '2026-11-20');
    expect(out.dates).toEqual(['2026-09-15', '2026-10-15', '2026-11-15']);
    expect(out.next).toBe('2026-12-15');
    expect(out.exhausted).toBe(false);
  });

  it('calculateNextDate keeps its anchor behaviour', () => {
    expect(calculateNextDate('2026-02-28', 'monthly', 1, 31)).toBe('2026-03-31T00:00:00.000Z');
    expect(calculateNextDate('2026-11-30', 'weekly', 1)).toBe('2026-12-07T00:00:00.000Z');
  });
});
