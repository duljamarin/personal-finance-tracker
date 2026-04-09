import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CURRENCY_SYMBOLS } from '../../utils/constants';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg">
        <p className="font-semibold text-sm mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm" style={{ color: entry.color }}>
            {entry.name}: {CURRENCY_SYMBOLS.EUR}{Number(entry.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

export default function NetWorthChart({ data, transactions = [] }) {
  const { t } = useTranslation();

  // Compute cumulative cash flow up to a given date string (YYYY-MM-DD)
  const getCashFlowUpTo = (dateStr) => {
    let income = 0;
    let expenses = 0;
    for (const tx of transactions) {
      const txDate = (tx.date || '').slice(0, 10);
      if (txDate <= dateStr) {
        const amount = tx.base_amount ?? tx.amount ?? 0;
        if (tx.type === 'income') income += amount;
        else expenses += amount;
      }
    }
    return income - expenses;
  };

  const hasSnapshots = data && data.length > 0;

  const chartData = useMemo(() => {
    if (hasSnapshots) {
      // Use snapshot dates, enrich with cash flow
      return data.map(item => {
        const snapshotDate = item.snapshot_date.slice(0, 10);
        const cashFlowNet = getCashFlowUpTo(snapshotDate);
        return {
          date: new Date(item.snapshot_date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          [t('networth.assets')]: item.total_assets,
          [t('networth.liabilities')]: item.total_liabilities,
          [t('networth.cashBalance')]: parseFloat(cashFlowNet.toFixed(2)),
          [t('networth.netWorth')]: parseFloat((item.total_assets + cashFlowNet - item.total_liabilities).toFixed(2)),
        };
      });
    }

    // No snapshots — generate monthly data points from transactions alone
    if (transactions.length === 0) return [];

    const monthMap = {};
    for (const tx of transactions) {
      const txDate = (tx.date || '').slice(0, 10);
      const monthKey = txDate.slice(0, 7); // YYYY-MM
      if (!monthMap[monthKey]) monthMap[monthKey] = true;
    }

    const months = Object.keys(monthMap).sort();
    if (months.length === 0) return [];

    return months.map(month => {
      const endOfMonth = `${month}-31`; // safe upper bound for <= comparison
      const cashFlowNet = getCashFlowUpTo(endOfMonth);
      const d = new Date(month + '-01');
      return {
        date: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        [t('networth.cashBalance')]: parseFloat(cashFlowNet.toFixed(2)),
        [t('networth.netWorth')]: parseFloat(cashFlowNet.toFixed(2)),
      };
    });
  }, [data, transactions, t, hasSnapshots]);

  const hasAssetData = hasSnapshots;

  if (chartData.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        {t('chart.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => `${CURRENCY_SYMBOLS.EUR}${(value / 1000).toFixed(0)}k`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.assets')}
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 3 }}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.cashBalance')}
          stroke="#3b82f6"
          strokeWidth={2}
          dot={{ fill: '#3b82f6', r: 3 }}
          strokeDasharray="5 3"
        />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.liabilities')}
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 3 }}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.netWorth')}
          stroke="#6366f1"
          strokeWidth={3}
          dot={{ fill: '#6366f1', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
