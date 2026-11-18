import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AXIS_PROPS, BAR_RADIUS, CHART_GRID, CHART_TOOLTIP_CLASS, useChartAnimation } from '../../utils/chartTheme';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { INCOME_COLOR } from '../../utils/chartColors';
// V4: spending / liability series use the category palette, never red.
const EXPENSE_COLOR = 'var(--c-data-sand)';

const ASSETS_COLOR = INCOME_COLOR;
const LIABILITIES_COLOR = 'var(--c-data-blue)';
const NETWORTH_COLOR = 'var(--c-data-violet)';

function CustomTooltip({ active, payload, label, fmt }) {
  if (active && payload && payload.length) {
    return (
      <div className={CHART_TOOLTIP_CLASS}>
        <p className="font-semibold text-sm text-fg mb-1">{label}</p>
        {payload.map((entry) => (
          <p key={entry.dataKey} className="text-sm tabular-nums" style={{ color: entry.color }}>
            {entry.name}: {fmt(Number(entry.value))}
          </p>
        ))}
      </div>
    );
  }
  return null;
}

/**
 * Monthly net-worth series: latest snapshot per month (assets, liabilities)
 * plus tracked cash up to that date; without snapshots, cash alone. Shared by
 * the chart below and the Net worth hero line.
 */
export function buildNetWorthSeries(data, transactions = []) {
  const cashUpTo = (dateStr) => {
    let net = 0;
    for (const tx of transactions) {
      if ((tx.date || '').slice(0, 10) <= dateStr) {
        const amount = tx.base_amount ?? tx.amount ?? 0;
        net += tx.type === 'income' ? amount : -amount;
      }
    }
    return net;
  };
  if (data && data.length > 0) {
    const monthMap = {};
    for (const item of data) {
      const key = item.snapshot_date.slice(0, 7);
      if (!monthMap[key] || item.snapshot_date > monthMap[key].snapshot_date) monthMap[key] = item;
    }
    return Object.values(monthMap)
      .sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date))
      .map((item) => {
        const cash = cashUpTo(item.snapshot_date.slice(0, 10));
        return { date: item.snapshot_date, netWorth: item.total_assets + cash - item.total_liabilities };
      });
  }
  const months = [...new Set(transactions.map((tx) => (tx.date || '').slice(0, 7)).filter(Boolean))].sort();
  return months.map((m) => ({ date: `${m}-01`, netWorth: cashUpTo(`${m}-31`) }));
}

export default function NetWorthChart({ data, transactions = [] }) {
  const { t } = useTranslation();
  const { format: fmt, symbol } = useDisplayCurrency();
  const anim = useChartAnimation();

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
      <div className="tile-inner text-center py-8 text-base font-bold text-fg">
        {t('chart.noData')}
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData}>
        <CartesianGrid {...CHART_GRID} />
        <XAxis
          dataKey="date"
          {...AXIS_PROPS}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          {...AXIS_PROPS}
          axisLine={false}
          tickLine={false}
          tickFormatter={(value) => {
            const abs = Math.abs(value);
            const str = `${symbol}${(abs / 1000).toFixed(0)}k`;
            return value < 0 ? `-${str}` : str;
          }}
          width={60}
        />
        <Tooltip content={<CustomTooltip fmt={fmt} />} />
        <Legend wrapperStyle={{ fontSize: 14, fontWeight: 600 }} formatter={(value) => <span className="text-fg">{value}</span>} />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.assets')}
            stroke={ASSETS_COLOR}
            strokeWidth={2}
            dot={{ fill: ASSETS_COLOR, r: 3 }} {...anim}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.cashBalance')}
          stroke={LIABILITIES_COLOR}
          strokeWidth={2}
          dot={{ fill: LIABILITIES_COLOR, r: 3 }}
          strokeDasharray="5 3" {...anim}
        />
        {hasAssetData && (
          <Line
            type="monotone"
            dataKey={t('networth.liabilities')}
            stroke={EXPENSE_COLOR}
            strokeWidth={2}
            dot={{ fill: EXPENSE_COLOR, r: 3 }} {...anim}
          />
        )}
        <Line
          type="monotone"
          dataKey={t('networth.netWorth')}
          stroke={NETWORTH_COLOR}
          strokeWidth={3}
          dot={{ fill: NETWORTH_COLOR, r: 3 }} {...anim}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
