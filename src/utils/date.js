// ─── Date helpers ────────────────────────────────────────────────────────────

/**
 * i18n language tag -> Intl locale for date formatting.
 *
 * Must match on prefix, not equality. i18n.js sets `nonExplicitSupportedLngs`,
 * so a browser reporting `sq-AL` gets Albanian translations while i18n.language
 * keeps the full tag — an `=== 'sq'` test then falls through to en-US and
 * renders "August 2026" inside an otherwise Albanian sentence. Prefix matching
 * is what the rest of the app already uses for language checks.
 */
export function getDateLocale(language) {
  return String(language || '').toLowerCase().startsWith('sq') ? 'sq-AL' : 'en-US';
}

export function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function getLastMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function getThisQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

export function getLast3Months() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { start: toISODate(start), end: toISODate(end) };
}

export function getThisYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { start: toISODate(start), end: toISODate(end) };
}
