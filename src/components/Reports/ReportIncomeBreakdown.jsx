import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import Card from '../UI/Card';

const CHART_PALETTE = [
  '#168b78', '#6A8FC4', '#C9A87C', '#9B7EB3', '#C46A75',
  '#43c5aa', '#D0A96A', '#7A9E7E', '#7A756A', '#5B8DB8',
];
const COLORS = CHART_PALETTE;

function CustomTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline px-3.5 py-2 rounded-lg shadow-md">
        <p className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary">{payload[0].name}</p>
        <p className="text-sm text-ink-primary dark:text-ink-dark-primary tabular-nums mt-0.5">€{payload[0].value.toFixed(2)}</p>
        <p className="text-xs text-ink-muted dark:text-ink-dark-muted tabular-nums">{payload[0].payload.pct}%</p>
      </div>
    );
  }
  return null;
}

export default function ReportIncomeBreakdown({ transactions }) {
  const { t } = useTranslation();

  const categoryData = useMemo(() => {
    const totals = {};
    transactions
      .filter(tx => tx.type === 'income')
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
          {t('reports.incomeByCategory')}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-6">
          {t('reports.noIncome')}
        </p>
      </Card>
    );
  }

  return (
    <Card padding="md">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-5">
        {t('reports.incomeByCategory')}
      </h3>

      {/* Donut + vertical category list */}
      <div className="flex flex-wrap gap-6 items-center mb-6">
        <div className="relative w-[180px] h-[180px] shrink-0">
          <ResponsiveContainer width={180} height={180}>
            <PieChart>
              <Pie
                data={categoryData}
                cx="50%"
                cy="50%"
                outerRadius={85}
                innerRadius={60}
                paddingAngle={1.5}
                dataKey="value"
                stroke="none"
              >
                {categoryData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2.5 min-w-0">
          {categoryData.slice(0, 6).map((entry, index) => (
            <div key={entry.name} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-ink-primary dark:text-ink-dark-primary truncate max-w-[160px]">{entry.name}</span>
              <span className="text-sm font-semibold text-ink-primary dark:text-ink-dark-primary tabular-nums ml-2">€{entry.value.toFixed(0)}</span>
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted tabular-nums">{entry.pct}%</span>
            </div>
          ))}
          {categoryData.length > 6 && (
            <p className="text-xs text-ink-muted dark:text-ink-dark-muted pt-1">
              + {categoryData.length - 6} {t('reports.moreCategories', { defaultValue: 'more' })}
            </p>
          )}
        </div>
      </div>

      {/* Full data table */}
      <div className="overflow-x-auto scrollbar-hide border-t border-gray-100 dark:border-zinc-800 pt-4">
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
    </Card>
  );
}
