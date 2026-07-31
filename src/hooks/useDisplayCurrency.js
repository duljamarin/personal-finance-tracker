import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { formatCurrency } from '../utils/formatCurrency';
import { fetchUserSettings } from '../utils/api/userSettings';
import { CURRENCY_SYMBOLS } from '../utils/constants';
import { APP_CONFIG } from '../config/app';

// Cached across components so a dashboard full of cards issues one read, not
// one per card. Invalidated by notifyCurrencyChanged below.
let cachedCurrency = null;
let inFlight = null;

const CURRENCY_EVENT = 'currency:changed';

/** Clears the cache and notifies mounted hooks. Call after changing currency. */
export function notifyCurrencyChanged(next) {
  cachedCurrency = next || null;
  inFlight = null;
  window.dispatchEvent(new CustomEvent(CURRENCY_EVENT, { detail: next }));
}

/** Test seam — drops the module-level cache between renders/tests. */
export function resetCurrencyCache() {
  cachedCurrency = null;
  inFlight = null;
}

async function loadCurrency(fallback) {
  if (cachedCurrency) return cachedCurrency;
  if (!inFlight) {
    inFlight = fetchUserSettings()
      .then((s) => {
        cachedCurrency = s.preferredCurrency || fallback;
        return cachedCurrency;
      })
      .catch(() => fallback)
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/**
 * The user's single app-wide currency.
 *
 * Every stored amount is already in this currency — the app is single-currency
 * (see 20260731090000_add_user_settings_preferred_currency.sql), so there is no
 * conversion step and no exchange-rate dependency: `format` only applies the
 * right symbol.
 *
 * Seeded from auth metadata when present so first paint uses the right symbol
 * instead of flashing EUR, then confirmed against user_settings, which is the
 * source of truth.
 */
export function useDisplayCurrency() {
  // useAuth() returns undefined outside an AuthProvider (isolated component
  // tests, logged-out marketing pages), so never destructure it directly.
  const user = useAuth()?.user;
  const base = APP_CONFIG.BASE_CURRENCY;
  const seed = cachedCurrency || user?.user_metadata?.preferred_currency || base;

  const [currency, setCurrency] = useState(seed);

  useEffect(() => {
    let cancelled = false;

    // No session yet (logged-out marketing pages, tests) — keep the seed and
    // skip the fetch rather than erroring.
    if (!user) return undefined;

    loadCurrency(base).then((c) => {
      if (!cancelled && c) setCurrency(c);
    });

    const onChange = (e) => {
      if (!cancelled && e.detail) setCurrency(e.detail);
    };
    window.addEventListener(CURRENCY_EVENT, onChange);

    return () => {
      cancelled = true;
      window.removeEventListener(CURRENCY_EVENT, onChange);
    };
  }, [base, user]);

  const symbol = CURRENCY_SYMBOLS[currency] ?? currency;

  const format = useCallback(
    (value, opts) => formatCurrency(Number(value) || 0, currency, opts),
    [currency]
  );

  return useMemo(() => ({ currency, symbol, format }), [currency, symbol, format]);
}

export default useDisplayCurrency;
