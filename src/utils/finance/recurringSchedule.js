// The one place that decides when a recurring rule occurs. Pure (no Supabase,
// no "now"): the generator (utils/api/recurring.js processRecurringTransactions)
// and the month forecast (utils/finance/forecast/forecastEngine.js) both walk
// a rule's schedule through occurrencesInRange, so "which occurrences fall in
// a range" has a single implementation.
import { dateOnly } from './calendar';

/**
 * Next run after `currentDate`. Works in UTC; monthly and yearly steps clamp
 * to the last day of short months and return to `anchorDay` afterwards
 * (31 Jan -> 28 Feb -> 31 Mar), so end-of-month rules do not drift.
 * Returns an ISO timestamp (midnight UTC for date-only input).
 */
export function calculateNextDate(currentDate, frequency, intervalCount, anchorDay = null) {
  const date = new Date(currentDate);
  const interval = intervalCount || 1;
  const originalDay = date.getUTCDate();
  // Fall back to the current day when no anchor is supplied, which keeps the
  // old 3-argument behaviour for callers that have no start_date at hand.
  const anchor = anchorDay || originalDay;

  // Set to `day`, or the month's last day when the month is too short. Assumes
  // `d` is already positioned on the 1st of the target month.
  const clampToMonth = (d, day) => {
    const daysInMonth = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
    d.setUTCDate(Math.min(day, daysInMonth));
  };

  switch (frequency) {
    case 'daily':
      date.setUTCDate(date.getUTCDate() + interval);
      break;
    case 'weekly':
      date.setUTCDate(date.getUTCDate() + interval * 7);
      break;
    case 'monthly': {
      // Move to the 1st first so adding months can't roll into the next one.
      date.setUTCDate(1);
      date.setUTCMonth(date.getUTCMonth() + interval);
      clampToMonth(date, anchor);
      break;
    }
    case 'yearly': {
      date.setUTCDate(1);
      date.setUTCFullYear(date.getUTCFullYear() + interval);
      clampToMonth(date, anchor);
      break;
    }
    default:
      date.setUTCDate(date.getUTCDate() + interval);
  }

  return date.toISOString();
}

/** Day of the month a rule is pinned to (from start_date), or null. */
export const anchorDayOf = (rule) => (rule?.start_date ? new Date(dateOnly(rule.start_date)).getUTCDate() : null);

/**
 * Walk a rule's schedule from its next run (next_run_at, or start_date before
 * the first run) up to `to`, inclusive.
 *
 * - dates: the occurrences in [from, to] ('YYYY-MM-DD'); from = null means
 *   every occurrence from the next run on.
 * - next: the schedule date the walk stopped at (the first one after `to`,
 *   or the one that ended the schedule).
 * - exhausted: the schedule ended before passing `to` (end_date passed or
 *   occurrences_limit used up).
 *
 * Every step counts toward occurrences_limit, starting from
 * occurrences_created. is_active is the caller's concern.
 */
export function occurrencesInRange(rule, from, to) {
  const dates = [];
  let date = rule?.next_run_at ? dateOnly(rule.next_run_at) : rule?.start_date ? dateOnly(rule.start_date) : null;
  if (!date) return { dates, next: null, exhausted: true };

  const limit = rule.occurrences_limit || null;
  const end = rule.end_date ? dateOnly(rule.end_date) : null;
  const anchor = anchorDayOf(rule);
  let position = Number(rule.occurrences_created) || 0;

  while (date <= to) {
    if (limit !== null && position >= limit) return { dates, next: date, exhausted: true };
    if (end !== null && date > end) return { dates, next: date, exhausted: true };
    if (from === null || date >= from) dates.push(date);
    position += 1;
    date = dateOnly(calculateNextDate(date, rule.frequency, rule.interval_count || 1, anchor));
  }
  return { dates, next: date, exhausted: false };
}
