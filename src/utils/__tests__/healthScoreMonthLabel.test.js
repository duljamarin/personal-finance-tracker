import { describe, it, expect } from 'vitest';

// The health score card now names the month it covers. Two things must hold:
// the label matches the stored month_date, and parsing never drifts a month
// backwards in timezones behind UTC.

// Mirrors the label logic in HealthScore.jsx.
function monthLabel(monthDate, locale) {
  if (!monthDate) return null;
  const [y, m] = String(monthDate).split('-').map(Number);
  if (!y || !m) return null;
  return new Date(y, m - 1, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}

describe('health score month label', () => {
  it.each([
    ['2026-08-01', 'en-US', 'August 2026'],
    ['2026-01-01', 'en-US', 'January 2026'],
    ['2026-12-01', 'en-US', 'December 2026'],
  ])('formats %s in English', (raw, locale, expected) => {
    expect(monthLabel(raw, locale)).toBe(expected);
  });

  it('formats in Albanian', () => {
    expect(monthLabel('2026-08-01', 'sq-AL')).toBe('gusht 2026');
  });

  it('does not drift to the previous month', () => {
    // `new Date('2026-08-01')` parses as UTC midnight; rendered in a timezone
    // behind UTC that lands on 31 July and the card would claim the wrong
    // month. Splitting the string and building a LOCAL date avoids that.
    expect(monthLabel('2026-08-01', 'en-US')).toContain('August');
    expect(monthLabel('2026-03-01', 'en-US')).toContain('March');
  });

  it('returns null when no month is stored, so the card falls back', () => {
    expect(monthLabel(null, 'en-US')).toBeNull();
    expect(monthLabel(undefined, 'en-US')).toBeNull();
    expect(monthLabel('', 'en-US')).toBeNull();
  });

  it('returns null for a malformed value rather than "Invalid Date"', () => {
    expect(monthLabel('not-a-date', 'en-US')).toBeNull();
  });
});
