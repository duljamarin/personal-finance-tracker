import { useMemo } from 'react';
import { useTransactions } from '../context/TransactionContext';
import { useCrypto } from '../context/CryptoContext';
import { useAsyncData } from './useAsyncData';
import { fetchRecurringTransactions, fetchBudgets, fetchSplitsForTransactions } from '../utils/api';
import { toISODate } from '../utils/date';
import { monthOf, shiftMonth, ymd } from '../utils/finance/calendar';
import { computeForecast } from '../utils/finance/forecast/forecastEngine';
import { FORECAST_CONFIG } from '../utils/finance/forecast/forecastConfig';

/**
 * End-of-month forecast for the current month, from decrypted data only.
 * Thin wiring around forecastEngine.computeForecast: nothing is computed here
 * and nothing is stored (no DB, no localStorage).
 *
 * - transactions: TransactionContext (already decrypted); split rows are
 *   fetched for split transactions in the lookback window so they count toward
 *   their categories.
 * - recurring rules and this month's budgets: fetched (decrypted) and refetched
 *   whenever a transaction changes (mutationCount) or `reloadKey` changes (the
 *   Budgets page passes its own reload signal).
 * - today: the user's LOCAL calendar day (toISODate), never the UTC day.
 *
 * Waits while the encryption key is loading or locked: amounts are
 * placeholders then.
 */
export function useMonthForecast({ reloadKey } = {}) {
  const { transactions = [], loading: txLoading, mutationCount } = useTransactions() || {};
  const { status } = useCrypto() || {};
  const cryptoReady = status === 'unlocked' || status === 'off';

  const today = toISODate(new Date());
  const month = monthOf(today);
  const first = shiftMonth(month.y, month.m, -FORECAST_CONFIG.LOOKBACK_MONTHS);
  const windowStart = ymd(first.y, first.m, 1);

  // Split transactions in the window, as a stable key so the fetch reruns only
  // when that set changes.
  const splitIds = useMemo(
    () => transactions.filter((tx) => tx.has_splits && tx.date >= windowStart).map((tx) => tx.id).sort().join(','),
    [transactions, windowStart],
  );

  const { data, loading } = useAsyncData(async () => {
    if (!cryptoReady) return null;
    const [recurring, budgets, splits] = await Promise.all([
      fetchRecurringTransactions(),
      fetchBudgets(month.y, month.m),
      splitIds ? fetchSplitsForTransactions(splitIds.split(',')) : {},
    ]);
    return { recurring: recurring || [], budgets: budgets || [], splits: splits || {} };
  }, [cryptoReady, mutationCount, reloadKey, splitIds, month.start], null);

  const forecast = useMemo(() => {
    if (!data || !cryptoReady) return null;
    const withSplits = transactions.map((tx) => (tx.has_splits ? { ...tx, splits: data.splits[tx.id] || [] } : tx));
    return computeForecast({ today, transactions: withSplits, recurring: data.recurring, budgets: data.budgets, config: FORECAST_CONFIG });
  }, [data, cryptoReady, transactions, today]);

  return {
    forecast,
    loading: Boolean(txLoading) || loading || !cryptoReady,
    isEmpty: !txLoading && transactions.length === 0,
  };
}

export default useMonthForecast;
