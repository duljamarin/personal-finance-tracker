// Shared client-side finance helpers. These replace SQL that previously ran
// server-side (SECURITY DEFINER RPCs / triggers) but broke once amount columns
// became E2E-encrypted text. Everything here operates on already-decrypted
// rows (numbers), produced by the crypto rowCodec on read.

// EUR-normalized amount for a transaction row. Mirrors the pervasive SQL
// COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0)).
export function baseAmountOf(tx) {
  const base = tx.base_amount;
  if (base !== null && base !== undefined && !Number.isNaN(Number(base))) {
    return Number(base);
  }
  const rate = tx.exchange_rate == null ? 1.0 : Number(tx.exchange_rate);
  return Number(tx.amount || 0) * (Number.isNaN(rate) ? 1.0 : rate);
}

// 'YYYY-MM' bucket key for a transaction's date (local-safe: dates are stored
// as plain 'YYYY-MM-DD' strings).
export function monthKey(dateStr) {
  return String(dateStr).slice(0, 7);
}

// First day (YYYY-MM-DD) of the month `offset` months before `ref`.
export function monthStart(ref, offset = 0) {
  const d = new Date(ref.getFullYear(), ref.getMonth() + offset, 1);
  return d;
}

export function toISODate(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Population standard deviation (STDDEV_POP equivalent).
export function stdDevPop(values) {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
}

export function avg(values) {
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
