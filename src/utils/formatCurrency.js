import { CURRENCY_SYMBOLS } from './constants';

/**
 * Format a currency amount with the correct symbol and sign.
 * Negative values always render with a leading minus: -€1,234.56
 *
 * @param {number} value
 * @param {string} [currencyCode='EUR']
 * @param {{ decimals?: number, compact?: boolean }} [opts]
 */
export function formatCurrency(value, currencyCode = 'EUR', { decimals = 2, compact = false } = {}) {
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? currencyCode;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: compact ? 0 : decimals,
    maximumFractionDigits: compact ? 0 : decimals,
  });

  return `${sign}${symbol}${formatted}`;
}

/**
 * Format an exchange rate to at most 3 decimal places,
 * trimming trailing zeros (e.g. 1.200 → "1.2", 1.000 → "1").
 */
export function formatExchangeRate(rate) {
  const n = Number(rate);
  if (!isFinite(n)) return '';
  return parseFloat(n.toFixed(3)).toString();
}
