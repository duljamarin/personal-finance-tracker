import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { CHART_PALETTE as COLORS } from '../../utils/chartColors';

export default function CategoryPieChart({ transactions, type }) {
  const { t } = useTranslation();

  const categoryTotals = {};

  transactions
    .filter(tx => tx.type === type)
    .forEach(tx => {
      const categoryName = tx.category?.name || 'Uncategorized';
      const amount = tx.base_amount || tx.amount || 0;
      if (!categoryTotals[categoryName]) {
        categoryTotals[categoryName] = 0;
      }
      categoryTotals[categoryName] += amount;
    });

  const data = Object.entries(categoryTotals)
    .map(([name, value]) => ({
      name: translateCategoryName(name),
      value: parseFloat(value.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-full bg-surface-hairline/60 dark:bg-surface-dark-hairline/60 flex items-center justify-center mb-3">
          <svg className="w-5 h-5 text-ink-muted dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        </div>
        <p className="text-sm text-ink-muted dark:text-white">{t('chart.noData')}</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className="bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline px-3.5 py-2 rounded-lg shadow-md">
          <p className="text-sm font-semibold text-ink-primary dark:text-white">{payload[0].name}</p>
          <p className="text-sm text-ink-primary dark:text-white tabular-nums mt-0.5">€{payload[0].value.toFixed(2)}</p>
          <p className="text-xs text-ink-muted dark:text-white tabular-nums">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid sm:grid-cols-[auto_1fr] gap-6 items-center">
      {/* Donut with total in center */}
      <div className="relative w-[180px] h-[180px] mx-auto sm:mx-0 shrink-0">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              outerRadius={85}
              innerRadius={60}
              paddingAngle={1.5}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Category list */}
      <div className="space-y-2.5">
        {data.slice(0, 6).map((entry, index) => {
          const pct = ((entry.value / total) * 100).toFixed(1);
          return (
            <div key={entry.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-sm text-ink-primary dark:text-white flex-1 truncate">{entry.name}</span>
              <span className="text-sm font-semibold text-ink-primary dark:text-white tabular-nums">€{entry.value.toFixed(0)}</span>
              <span className="text-xs text-ink-muted dark:text-white tabular-nums w-12 text-right">{pct}%</span>
            </div>
          );
        })}
        {data.length > 6 && (
          <p className="text-xs text-ink-muted dark:text-white pt-1">+ {data.length - 6} more</p>
        )}
      </div>
    </div>
  );
}
