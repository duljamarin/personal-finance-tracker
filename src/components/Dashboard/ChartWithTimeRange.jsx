import { useState, useMemo, useTransition } from 'react';
import { useTranslation } from 'react-i18next';
import CombinedMonthChart from '../Transactions/CombinedMonthChart';
import Card from '../UI/Card';
import SegmentedControl from '../UI/SegmentedControl';

const RANGES = ['3m', '6m', '12m', 'all'];

export default function ChartWithTimeRange({ transactions, index, className = '' }) {
  const { t } = useTranslation();
  const [range, setRange] = useState('6m');
  // INP: range switching is a transition (CLAUDE.md performance rules).
  const [isPending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (range === 'all') return transactions;
    const months = { '3m': 3, '6m': 6, '12m': 12 }[range];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return transactions.filter(tx => new Date(tx.date) >= cutoff);
  }, [transactions, range]);

  return (
    <Card index={index} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-gap">
        <h2 className="text-h3 font-bold text-fg">
          {t('chart.cashFlow')}
        </h2>
        <SegmentedControl
          size="sm"
          ariaLabel={t('chart.cashFlow')}
          value={range}
          onChange={(r) => startTransition(() => setRange(r))}
          options={RANGES.map((r) => ({ value: r, label: t(`dashboard.range.${r}`) }))}
        />
      </div>
      <div className={isPending ? 'opacity-60 btn-motion' : ''}>
        <CombinedMonthChart transactions={filtered} />
      </div>
    </Card>
  );
}
