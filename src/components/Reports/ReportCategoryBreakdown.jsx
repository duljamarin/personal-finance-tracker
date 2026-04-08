import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import Card from '../UI/Card';

const COLORS = [
  '#3b82f6', '#ef4444', '#0D9488', '#f59e0b', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16',
];

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-lg shadow-lg">
        <p className="font-semibold text-sm">{payload[0].name}</p>
        <p className="text-sm">€{payload[0].value.toFixed(2)}</p>
        <p className="text-xs text-gray-300">{payload[0].payload.pct}%</p>
      </div>
    );
  }
  return null;
}

export default function ReportCategoryBreakdown({ transactions }) {
  const { t } = useTranslation();

  const categoryData = useMemo(() => {
    const totals = {};
    transactions
      .filter(tx => tx.type === 'expense')
      .forEach(tx => {
        const name = tx.categories?.name || tx.category?.name || t('transactions.all');
        const amount = tx.base_amount ?? tx.amount ?? 0;
        totals[name] = (totals[name] || 0) + amount;
      });

    const total = Object.values(totals).reduce((s, v) => s + v, 0);

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        value: parseFloat(value.toFixed(2)),
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, t]);

  const total = categoryData.reduce((s, d) => s + d.value, 0);

  if (categoryData.length === 0) {
    return (
      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
          {t('reports.categoryBreakdown')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          {t('reports.noData')}
        </p>
      </Card>
    );
  }

  const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    return (
      <text
        x={x}
        y={y}
        fill="white"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontSize: '11px', fontWeight: 700, textShadow: '1px 1px 2px rgba(0,0,0,0.8)' }}
      >
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">
        {t('reports.categoryBreakdown')}
      </h3>
      <div className="flex flex-col md:flex-row gap-6">
        {/* Table */}
        <div className="flex-1 min-w-0">
          <div className="overflow-x-auto scrollbar-hide">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-700">
                  <th className="text-left py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">
                    {t('reports.category')}
                  </th>
                  <th className="text-right py-2 pr-4 text-gray-500 dark:text-gray-400 font-medium">
                    {t('reports.amount')}
                  </th>
                  <th className="text-right py-2 text-gray-500 dark:text-gray-400 font-medium">
                    {t('reports.percentage')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoryData.map((row, idx) => (
                  <tr
                    key={row.name}
                    className="border-b border-gray-100 dark:border-zinc-800 last:border-0"
                  >
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <span className="text-gray-800 dark:text-gray-200 font-medium truncate max-w-[140px]">
                          {row.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-800 dark:text-gray-200 font-medium tabular-nums">
                      €{row.value.toFixed(2)}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 dark:bg-zinc-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${row.pct}%`,
                              backgroundColor: COLORS[idx % COLORS.length],
                            }}
                          />
                        </div>
                        <span className="text-gray-500 dark:text-gray-400 tabular-nums w-10 text-right">
                          {row.pct}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 dark:border-zinc-700">
                  <td className="pt-2.5 pr-4 font-semibold text-gray-900 dark:text-white">Total</td>
                  <td className="pt-2.5 pr-4 text-right font-semibold text-gray-900 dark:text-white tabular-nums">
                    €{total.toFixed(2)}
                  </td>
                  <td className="pt-2.5 text-right font-semibold text-gray-500 dark:text-gray-400">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Pie Chart + Legend below */}
        <div className="w-full md:w-72 flex-shrink-0 flex flex-col items-center">
          <PieChart width={260} height={220}>
            <Pie
              data={categoryData}
              cx={130}
              cy={100}
              labelLine={false}
              label={renderLabel}
              outerRadius={90}
              innerRadius={40}
              dataKey="value"
            >
              {categoryData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-2 px-2">
            {categoryData.map((row, idx) => (
              <div key={row.name} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400">{row.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}
