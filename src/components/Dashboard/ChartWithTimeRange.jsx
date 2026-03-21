import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import CombinedMonthChart from '../Transactions/CombinedMonthChart';

const RANGES = ['3m', '6m', '12m', 'all'];

export default function ChartWithTimeRange({ transactions }) {
  const { t } = useTranslation();
  const [range, setRange] = useState('6m');

  const filtered = useMemo(() => {
    if (range === 'all') return transactions;
    const months = { '3m': 3, '6m': 6, '12m': 12 }[range];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter(tx => new Date(tx.date) >= cutoff);
  }, [transactions, range]);

  return (
    <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-zinc-800 mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
          {t('chart.monthlyOverview')}
        </h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r
                  ? 'bg-brand-600 text-white'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >
              {t(`dashboard.range.${r}`)}
            </button>
          ))}
        </div>
      </div>
      <CombinedMonthChart transactions={filtered} />
    </div>
  );
}
