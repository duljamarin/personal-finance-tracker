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
import { AXIS_PROPS, BAR_RADIUS, CHART_GRID, useChartAnimation } from '../../utils/chartTheme';
import ChartTooltip, { rowsFromPayload } from '../UI/ChartTooltip';
import Card from '../UI/Card';
import { INCOME_COLOR } from '../../utils/chartColors';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

function formatLabel(dateStr) {
  if (!dateStr) return '';
  return dateStr.slice(0, 10);
}

function PctChange({ current, previous, positiveIsGood }) {
  const { t } = useTranslation();
  if (previous === 0) return <span className="text-sm text-fg">-</span>;

  const pct = (((current - previous) / previous) * 100).toFixed(1);
  const isUp = current > previous;
  const isGood = positiveIsGood ? isUp : !isUp;

  return (
    <span className={`inline-flex items-center gap-0.5 text-sm font-medium text-fg`}>
      {isUp ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {isUp ? '+' : '-'}{Math.abs(pct)}%
    </span>
  );
}

function CustomTooltip({ active, payload, label, fmt }) {
  if (!active || !payload || !payload.length) return null;
  return <ChartTooltip label={label} rows={rowsFromPayload(payload, fmt)} />;
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
  const anim = useChartAnimation();
  const { format: fmt, symbol } = useDisplayCurrency();

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
      <h3 className="text-heading text-fg mb-1">
        {t('reports.periodComparison')}
      </h3>
      <p className="text-sm text-fg mb-4">
        {t('reports.currentPeriod')}: {formatLabel(startDate)} - {formatLabel(endDate)}
        {' · '}
        {t('reports.previousPeriod')}: {formatLabel(prevStartDate)} - {formatLabel(prevEndDate)}
      </p>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Bar chart */}
        <div className="flex-1 overflow-x-auto">
          <BarChart width={500} height={240} data={chartData} barGap={4} barCategoryGap="35%">
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="name"
              {...AXIS_PROPS}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `${symbol}${Math.round(v)}`}
              {...AXIS_PROPS}
              axisLine={false}
              tickLine={false}
              width={70}
            />
            <Tooltip content={<CustomTooltip fmt={fmt} />} />
            <Legend wrapperStyle={{ fontSize: 14, fontWeight: 600 }} formatter={(value) => <span className="text-fg">{value}</span>} />
            <Bar dataKey={currentLabel} fill={INCOME_COLOR} radius={BAR_RADIUS} {...anim} />
            {/* previous period: brand-300 tint (lighter teal) — no CSS var, brand-ramp literal */}
            {/* Previous period recedes as a neutral; the old mint was pre-repaint teal. */}
            <Bar dataKey={previousLabel} fill="var(--inner-2)" radius={BAR_RADIUS} {...anim} />
          </BarChart>
        </div>

        {/* Summary table */}
        <div className="w-full md:w-56 flex-shrink-0">
          <div className="space-y-4">
            {[
              { label: t('reports.income'), curr: curr.income, prev: prev.income, positiveIsGood: true },
              { label: t('reports.expenses'), curr: curr.expenses, prev: prev.expenses, positiveIsGood: false },
            ].map((row) => (
              <div key={row.label} className="tile-inner p-gap">
                <p className="text-sm text-fg mb-1">{row.label}</p>
                <div className="flex items-end justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-fg">
                      {fmt(row.curr)}
                    </p>
                    <p className="text-sm text-fg">
                      {t('reports.previousPeriod')}: {fmt(row.prev)}
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
