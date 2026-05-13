import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CURRENCY_SYMBOLS } from '../../utils/constants';
import useDarkMode from '../../hooks/useDarkMode';

function CustomTooltip({ active, payload, label }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline px-3.5 py-2 rounded-lg shadow-md">
        <p className="font-semibold text-sm text-ink-primary dark:text-white mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm tabular-nums" style={{ color: entry.color }}>
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
  const [dark] = useDarkMode();

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
      // Deduplicate by month, keeping the latest snapshot per month
      const monthMap = {};
      for (const item of data) {
        const monthKey = item.snapshot_date.slice(0, 7);
        if (!monthMap[monthKey] || item.snapshot_date > monthMap[monthKey].snapshot_date) {
          monthMap[monthKey] = item;
        }
      }
      const deduped = Object.values(monthMap).sort((a, b) =>
        a.snapshot_date.localeCompare(b.snapshot_date)
      );

      return deduped.map(item => {
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
      <div className="text-center py-8 text-ink-muted dark:text-white">
        {t('chart.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="currentColor" strokeOpacity={0.08} className="text-surface-hairline dark:text-surface-dark-hairline" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: dark ? '#FFFFFF' : '#6b7280' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: dark ? '#FFFFFF' : '#6b7280' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => {
            const abs = Math.abs(value);
            const str = `${CURRENCY_SYMBOLS.EUR}${(abs / 1000).toFixed(0)}k`;
            return value < 0 ? `-${str}` : str;
          }}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.assets')}
            stroke="#168b78"
            strokeWidth={2}
            dot={{ fill: '#168b78', r: 3 }}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.cashBalance')}
          stroke="#6A8FC4"
          strokeWidth={2}
          dot={{ fill: '#6A8FC4', r: 3 }}
          strokeDasharray="5 3"
        />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.liabilities')}
            stroke="#e8394d"
            strokeWidth={2}
            dot={{ fill: '#e8394d', r: 3 }}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.netWorth')}
          stroke="#8b5cf6"
          strokeWidth={3}
          dot={{ fill: '#8b5cf6', r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
