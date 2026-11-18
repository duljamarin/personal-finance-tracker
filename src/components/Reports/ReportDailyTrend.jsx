import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { AXIS_PROPS, BAR_RADIUS, CHART_GRID, useChartAnimation } from '../../utils/chartTheme';
import ChartTooltip, { rowsFromPayload } from '../UI/ChartTooltip';
import Card from '../UI/Card';
import { toISODate } from '../../utils/date';
import { INCOME_COLOR } from '../../utils/chartColors';
// V4: spending / liability series use the category palette, never red.
const EXPENSE_COLOR = 'var(--c-data-sand)';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

function CustomTooltip({ active, payload, label, fmt }) {
  if (!active || !payload || !payload.length) return null;
  return <ChartTooltip label={label} rows={rowsFromPayload(payload, fmt)} />;
}

export default function ReportDailyTrend({ transactions, startDate, endDate }) {
  const { t } = useTranslation();
  const anim = useChartAnimation();
  const { format: fmt, symbol } = useDisplayCurrency();

  const dailyData = useMemo(() => {
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    const dayMap = {};

    // Initialize all days in range
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const key = toISODate(d);
      dayMap[key] = { date: key, income: 0, expenses: 0 };
    }

    transactions.forEach(tx => {
      const day = (tx.date || '').slice(0, 10);
      if (!dayMap[day]) return;
      const amount = tx.base_amount ?? tx.amount ?? 0;
      if (tx.type === 'income') {
        dayMap[day].income += amount;
      } else {
        dayMap[day].expenses += amount;
      }
    });

    return Object.values(dayMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        income: parseFloat(d.income.toFixed(2)),
        expenses: parseFloat(d.expenses.toFixed(2)),
        label: d.date.slice(5), // MM-DD
      }));
  }, [transactions, startDate, endDate]);

  if (dailyData.length === 0) return null;

  return (
    <Card padding="md">
      <h3 className="text-heading text-fg mb-4">
        {t('reports.dailySpendingTrend')}
      </h3>
      <div className="w-full">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={INCOME_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={INCOME_COLOR} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={EXPENSE_COLOR} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={EXPENSE_COLOR} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis
                dataKey="label"
                {...AXIS_PROPS}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `${symbol}${Math.round(v)}`}
                {...AXIS_PROPS}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip fmt={fmt} />} />
              <Area
                type="monotone"
                dataKey="income"
                name={t('reports.dailyIncome')}
                stroke={INCOME_COLOR}
                strokeWidth={2}
                fill="url(#colorIncome)" {...anim}
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name={t('reports.dailyExpenses')}
                stroke={EXPENSE_COLOR}
                strokeWidth={2}
                fill="url(#colorExpenses)" {...anim}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-[18px] mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-swatch" style={{ backgroundColor: INCOME_COLOR }} aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">{t('reports.dailyIncome')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-swatch" style={{ backgroundColor: EXPENSE_COLOR }} aria-hidden="true" />
          <span className="text-sm font-semibold text-fg">{t('reports.dailyExpenses')}</span>
        </div>
      </div>
    </Card>
  );
}
