import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CURRENCY_SYMBOLS } from '../../utils/constants';

export default function NetWorthChart({ data }) {
  const { t } = useTranslation();

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('chart.noData')}
      </div>
    );
  }

  // Transform data for chart
  const chartData = data.map(item => ({
    date: new Date(item.snapshot_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
    [t('networth.assets')]: item.total_assets,
    [t('networth.liabilities')]: item.total_liabilities,
    [t('networth.netWorth')]: item.net_worth
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-300 dark:stroke-gray-600" />
        <XAxis 
          dataKey="date" 
          className="text-xs fill-gray-600 dark:fill-gray-400"
        />
        <YAxis 
          className="text-xs fill-gray-600 dark:fill-gray-400"
          tickFormatter={(value) => `${CURRENCY_SYMBOLS.EUR}${(value / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'var(--tooltip-bg)',
            border: '1px solid var(--tooltip-border)',
            borderRadius: '0.5rem'
          }}
          formatter={(value) => `${CURRENCY_SYMBOLS.EUR}${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey={t('networth.assets')} 
          stroke="#10b981" 
          strokeWidth={2}
          dot={{ fill: '#10b981' }}
        />
        <Line 
          type="monotone" 
          dataKey={t('networth.liabilities')} 
          stroke="#ef4444" 
          strokeWidth={2}
          dot={{ fill: '#ef4444' }}
        />
        <Line 
          type="monotone" 
          dataKey={t('networth.netWorth')} 
          stroke="#6366f1" 
          strokeWidth={3}
          dot={{ fill: '#6366f1' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
