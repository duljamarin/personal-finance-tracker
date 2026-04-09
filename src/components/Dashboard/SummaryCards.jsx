import { useTranslation } from 'react-i18next';

export default function SummaryCards({ totalIncome, totalExpense, net, hasMixedCurrencies, loading }) {
  const { t } = useTranslation();

  const cards = [
    {
      label: t('dashboard.totalIncome'),
      value: totalIncome,
      color: 'text-brand-600 dark:text-brand-400',
      dot: 'bg-brand-500',
    },
    {
      label: t('dashboard.totalExpenses'),
      value: totalExpense,
      color: 'text-red-600 dark:text-red-400',
      dot: 'bg-red-500',
    },
    {
      label: t('dashboard.balance'),
      value: net,
      color: net >= 0 ? 'text-gray-900 dark:text-white' : 'text-red-600 dark:text-red-400',
      dot: 'bg-gray-400 dark:bg-gray-500',
    },
  ];

  const showSkeleton = loading && totalIncome === 0 && totalExpense === 0;

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card, i) => (
          <div key={i} className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-5 border border-gray-200 dark:border-zinc-800">
            <div className="flex items-center gap-2 mb-2">
              <span className={`w-1.5 h-1.5 rounded-full ${card.dot}`} />
              <p className="text-xs text-gray-500 dark:text-gray-400 font-medium uppercase tracking-wider">{card.label}</p>
            </div>
            {showSkeleton ? (
              <div className="h-8 sm:h-9 bg-gray-200 dark:bg-zinc-700 rounded-lg w-2/3 animate-pulse" />
            ) : (
              <p className={`text-2xl sm:text-3xl font-bold tabular-nums tracking-tight ${card.color}`}>
                &euro;{card.value.toFixed(2)}
              </p>
            )}
            <p className="text-xs mt-1.5 text-gray-400 dark:text-gray-500">{t('currency.baseCurrency')}</p>
          </div>
        ))}
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
