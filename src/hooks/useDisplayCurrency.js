import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { fetchExchangeRate } from '../utils/exchangeRate';
import { formatCurrency } from '../utils/formatCurrency';
import { CURRENCY_SYMBOLS } from '../utils/constants';
import { APP_CONFIG } from '../config/app';

/**
 * Display-currency helper for values that are STORED IN EUR.
 *
 * Budgets, goals and every report aggregate live in the base currency
 * (`base_amount` / `target_amount` are normalised to EUR), so rendering them
 * with the user's symbol alone would mislabel the number: 150000 EUR is not
 * 150000 ALL. This hook converts first, then formats.
 *
 * Until the rate resolves — and permanently if the FX endpoint is unreachable —
 * `ready` stays false and amounts render as plain EUR. That keeps the figure
 * truthful instead of showing a converted-looking number built on a guess.
 *
 * For values that carry their own `currency_code` (transactions, recurring),
 * do NOT use this: format that row's own amount with its own code.
 */
export function useDisplayCurrency() {
  const { user } = useAuth();
  const base = APP_CONFIG.BASE_CURRENCY;
  const currency = user?.user_metadata?.preferred_currency || base;

  // eurPerUnit: "1 <currency> = X EUR". null until known / on failure.
  const [eurPerUnit, setEurPerUnit] = useState(currency === base ? 1 : null);

  useEffect(() => {
    let cancelled = false;

    if (currency === base) {
      setEurPerUnit(1);
      return () => { cancelled = true; };
    }

    setEurPerUnit(null);
    fetchExchangeRate(currency)
      .then((rate) => {
        if (!cancelled) setEurPerUnit(rate && rate > 0 ? rate : null);
      })
      .catch(() => {
        if (!cancelled) setEurPerUnit(null);
      });

    return () => { cancelled = true; };
  }, [currency, base]);

  const ready = eurPerUnit !== null;
  // Falling back to EUR keeps the amount honest when FX is unavailable.
  const activeCurrency = ready ? currency : base;
  const symbol = CURRENCY_SYMBOLS[activeCurrency] ?? activeCurrency;

  /** EUR amount -> display currency amount (unformatted number). */
  const convert = useCallback(
    (eurValue) => {
      const n = Number(eurValue) || 0;
      return ready && eurPerUnit !== 1 ? n / eurPerUnit : n;
    },
    [ready, eurPerUnit]
  );

  /** EUR amount -> fully formatted string in the display currency. */
  const format = useCallback(
    (eurValue, opts) => formatCurrency(convert(eurValue), activeCurrency, opts),
    [convert, activeCurrency]
  );

  return useMemo(
    () => ({ currency: activeCurrency, symbol, ready, convert, format }),
    [activeCurrency, symbol, ready, convert, format]
  );
}

export default useDisplayCurrency;
