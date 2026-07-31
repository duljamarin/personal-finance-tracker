// Non-React counterpart to hooks/useDisplayCurrency, for background paths
// (notification builders) that have no component context.
//
// Same rule as the hook: values stored in the base currency (EUR) are converted
// to the user's preferred currency before formatting, and fall back to plain EUR
// whenever the rate is unavailable — a mislabelled number is worse than an
// unconverted one.
import { getSupabase } from './api/_auth';
import { fetchExchangeRate } from './exchangeRate';
import { formatCurrency } from './formatCurrency';
import { APP_CONFIG } from '../config/app';

/**
 * Returns a formatter for EUR-denominated values: (eurValue, opts) => string.
 * Safe to call on every notification build — getSession() reads local cache and
 * fetchExchangeRate caches rates for an hour.
 */
export async function getDisplayFormatter() {
  const base = APP_CONFIG.BASE_CURRENCY;
  let currency = base;

  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    currency = session?.user?.user_metadata?.preferred_currency || base;
  } catch {
    currency = base;
  }

  if (currency === base) {
    return (value, opts) => formatCurrency(Number(value) || 0, base, opts);
  }

  let eurPerUnit = null;
  try {
    const rate = await fetchExchangeRate(currency);
    if (rate && rate > 0) eurPerUnit = rate;
  } catch {
    eurPerUnit = null;
  }

  if (eurPerUnit === null) {
    return (value, opts) => formatCurrency(Number(value) || 0, base, opts);
  }

  return (value, opts) =>
    formatCurrency((Number(value) || 0) / eurPerUnit, currency, opts);
}
