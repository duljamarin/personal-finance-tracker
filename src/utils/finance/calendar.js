// Pure calendar math on 'YYYY-MM-DD' strings. The string IS the calendar
// date, so there is no time zone in here: callers decide which "today" they
// mean (the user's local day via utils/date.toISODate, or the UTC day where a
// server timestamp is involved). Only Date.UTC is used, never local Date.

const ISO_DATE_LENGTH = 10; // 'YYYY-MM-DD'
const pad2 = (n) => String(n).padStart(2, '0');

/** 'YYYY-MM-DD' part of a date string or ISO timestamp. */
export const dateOnly = (value) => String(value).slice(0, ISO_DATE_LENGTH);

/** { y, m, d } (m is 1-based) of a 'YYYY-MM-DD' string. */
export function parseYMD(value) {
  const [y, m, d] = dateOnly(value).split('-').map(Number);
  return { y, m, d };
}

/** 'YYYY-MM-DD' from year, 1-based month, day. */
export const ymd = (y, m, d) => `${y}-${pad2(m)}-${pad2(d)}`;

/** Days in a month (1-based month). */
export const daysInMonthOf = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();

/** The month `offset` months away from (y, m), as { y, m }. */
export function shiftMonth(y, m, offset) {
  const dt = new Date(Date.UTC(y, m - 1 + offset, 1));
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth() + 1 };
}

/**
 * The calendar month containing `date`: first and last day, its length, and
 * the day number of `date` within it.
 */
export function monthOf(date) {
  const { y, m, d } = parseYMD(date);
  const days = daysInMonthOf(y, m);
  return { y, m, day: d, daysInMonth: days, start: ymd(y, m, 1), end: ymd(y, m, days) };
}

/** Today's date in UTC (the day server timestamps such as next_run_at use). */
export const utcToday = (now = new Date()) => dateOnly(now.toISOString());

/** Midnight-UTC ISO timestamp for a 'YYYY-MM-DD' date (next_run_at format). */
export const runAtOf = (date) => new Date(`${dateOnly(date)}T00:00:00Z`).toISOString();
