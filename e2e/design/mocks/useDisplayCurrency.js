import { useMemo } from 'react';
import { formatCurrency } from '../../../src/utils/formatCurrency';

// Same formatter as production, fixed to EUR.
export function notifyCurrencyChanged() {}
export function resetCurrencyCache() {}
export function useDisplayCurrency() {
  return useMemo(() => ({
    currency: 'EUR',
    symbol: '€',
    format: (v, opts) => formatCurrency(Number(v) || 0, 'EUR', opts),
  }), []);
}
export default useDisplayCurrency;
