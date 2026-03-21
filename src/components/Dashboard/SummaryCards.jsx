import { useTranslation } from 'react-i18next';

export default function SummaryCards({ totalIncome, totalExpense, net, hasMixedCurrencies }) {
  const { t } = useTranslation();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">{t('dashboard.totalIncome')}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-brand-600 dark:text-brand-400 tracking-tight">&euro;{totalIncome.toFixed(2)}</p>
          <p className="text-xs mt-1 summary-eur-label">{t('currency.baseCurrency')}</p>
        </div>
        <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">{t('dashboard.totalExpenses')}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums text-red-600 dark:text-red-400 tracking-tight">&euro;{totalExpense.toFixed(2)}</p>
          <p className="text-xs mt-1 summary-eur-label">{t('currency.baseCurrency')}</p>
        </div>
        <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider mb-2">{t('dashboard.balance')}</p>
          <p className="text-2xl sm:text-3xl font-bold tabular-nums tracking-tight text-gray-900 dark:text-white">&euro;{net.toFixed(2)}</p>
          <p className="text-xs mt-1 summary-eur-label">{t('currency.baseCurrency')}</p>
        </div>
      </div>

      {hasMixedCurrencies && (
        <div className="mt-4 p-3 bg-brand-50/50 dark:bg-brand-900/10 border border-brand-200 dark:border-brand-800/30 rounded-lg flex items-center gap-2 text-sm text-brand-700 dark:text-brand-300">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('currency.mixedCurrencies')}</span>
        </div>
      )}
    </>
  );
}
