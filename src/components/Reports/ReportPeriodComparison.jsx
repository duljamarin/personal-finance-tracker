import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import Card from '../UI/Card';

function formatLabel(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

function PctChange({ current, previous, positiveIsGood }) {
  const { t } = useTranslation();
  if (previous === 0) return <span className="text-xs text-gray-400 dark:text-gray-500">-</span>;

  const pct = (((current - previous) / previous) * 100).toFixed(1);
  const isUp = current > previous;
  const isGood = positiveIsGood ? isUp : !isUp;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isGood ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'}`}>
      {isUp ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {Math.abs(pct)}%
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: €{Number(entry.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ReportPeriodComparison({
  transactions,
  prevTransactions,
  startDate,
  endDate,
  prevStartDate,
  prevEndDate,
}) {
  const { t } = useTranslation();

  const calcTotals = (txs) => {
    const income = txs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    const expenses = txs
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    return { income: parseFloat(income.toFixed(2)), expenses: parseFloat(expenses.toFixed(2)) };
  };

  const curr = calcTotals(transactions);
  const prev = calcTotals(prevTransactions);

  const chartData = useMemo(() => [
    {
      name: t('reports.income'),
      [t('reports.currentPeriod')]: curr.income,
      [t('reports.previousPeriod')]: prev.income,
    },
    {
      name: t('reports.expenses'),
      [t('reports.currentPeriod')]: curr.expenses,
      [t('reports.previousPeriod')]: prev.expenses,
    },
  ], [curr, prev, t]);

  const currentLabel = t('reports.currentPeriod');
  const previousLabel = t('reports.previousPeriod');

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">
        {t('reports.periodComparison')}
      </h3>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
        {t('reports.currentPeriod')}: {formatLabel(startDate)} - {formatLabel(endDate)}
        {' · '}
        {t('reports.previousPeriod')}: {formatLabel(prevStartDate)} - {formatLabel(prevEndDate)}
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Bar chart */}
        <div className="flex-1 overflow-x-auto">
          <BarChart width={500} height={240} data={chartData} barGap={4} barCategoryGap="35%">
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="name"
              tick={{ fontSize: 12, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `€${v}`}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            <Bar dataKey={currentLabel} fill="#0d9488" radius={[4, 4, 0, 0]} />
            <Bar dataKey={previousLabel} fill="#99f6e4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </div>

        {/* Summary table */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="space-y-4">
            {[
              { label: t('reports.income'), curr: curr.income, prev: prev.income, positiveIsGood: true },
              { label: t('reports.expenses'), curr: curr.expenses, prev: prev.expenses, positiveIsGood: false },
            ].map((row) => (
              <div key={row.label} className="p-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{row.label}</p>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      €{row.curr.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {t('reports.previousPeriod')}: €{row.prev.toFixed(2)}
                    </p>
                  </div>
                  <PctChange current={row.curr} previous={row.prev} positiveIsGood={row.positiveIsGood} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
