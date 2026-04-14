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
import Card from '../UI/Card';
import { toISODate } from '../../utils/date';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: €{Number(entry.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function ReportDailyTrend({ transactions, startDate, endDate }) {
  const { t } = useTranslation();

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
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {t('reports.dailySpendingTrend')}
      </h3>
      <div className="w-full">
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tickFormatter={(v) => `€${v}`}
                tick={{ fontSize: 11, fill: '#6b7280' }}
                axisLine={false}
                tickLine={false}
                width={60}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                name={t('reports.dailyIncome')}
                stroke="#0d9488"
                strokeWidth={2}
                fill="url(#colorIncome)"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                name={t('reports.dailyExpenses')}
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorExpenses)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      {/* Legend */}
      <div className="flex items-center justify-center gap-6 mt-2">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-[#0d9488]" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('reports.dailyIncome')}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 rounded bg-[#ef4444]" />
          <span className="text-xs text-gray-500 dark:text-gray-400">{t('reports.dailyExpenses')}</span>
        </div>
      </div>
    </Card>
  );
}
