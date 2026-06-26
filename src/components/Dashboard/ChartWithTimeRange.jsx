import { useState, useMemo, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import CombinedMonthChart from '../Transactions/CombinedMonthChart';

const RANGES = ['3m', '6m', '12m', 'all'];

export default function ChartWithTimeRange({ transactions }) {
  const { t } = useTranslation();
  const [range, setRange] = useState('6m');
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (range === 'all') return transactions;
    const months = { '3m': 3, '6m': 6, '12m': 12 }[range];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter(tx => new Date(tx.date) >= cutoff);
  }, [transactions, range]);

  return (
    <div className="bg-white dark:bg-surface-dark-card rounded-container p-4 sm:p-5 border border-surface-hairline dark:border-surface-dark-hairline mb-6">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h3 className="font-semibold tracking-tight text-sm text-ink-primary dark:text-white">
          {t('chart.monthlyOverview')}
        </h3>
        <div className="flex gap-1">
          {RANGES.map(r => (
            <button
              key={r}
              onClick={() => startTransition(() => setRange(r))}
              className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                range === r
                  ? 'bg-brand-600 text-white'
                  : 'bg-surface-subtle dark:bg-surface-dark-subtle text-ink-muted dark:text-white hover:bg-surface-hairline dark:hover:bg-surface-dark-hairline'
              }`}
            >
              {t(`dashboard.range.${r}`)}
            </button>
          ))}
        </div>
      </div>
      <div className={isPending ? 'opacity-60 transition-opacity' : ''}>
        <CombinedMonthChart transactions={filtered} />
      </div>
    </div>
  );
}
