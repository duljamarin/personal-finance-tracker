import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { useTranslation } from 'react-i18next';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { colorFromName } from '../UI/CategoryAvatar';
import { CHART_TOOLTIP_CLASS, useChartAnimation } from '../../utils/chartTheme';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

// layout="stacked" puts the list under the donut, for narrow side columns.
export default function CategoryPieChart({ transactions, type, layout = 'inline' }) {
  const stacked = layout === 'stacked';
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
  const anim = useChartAnimation();

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
      // Same per-category color as avatars and the Activity stacked bar.
      color: colorFromName(name),
      value: parseFloat(value.toFixed(2))
    }))
    .sort((a, b) => b.value - a.value);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <div className="w-12 h-12 rounded-icon bg-inner text-brand-text flex items-center justify-center mb-3">
          <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0 0 20.25 18V6A2.25 2.25 0 0 0 18 3.75H6A2.25 2.25 0 0 0 3.75 6v12A2.25 2.25 0 0 0 6 20.25Z" />
          </svg>
        </div>
        <p className="text-sm font-bold text-fg">{t('chart.noData')}</p>
      </div>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / total) * 100).toFixed(1);
      return (
        <div className={CHART_TOOLTIP_CLASS}>
          <p className="font-extrabold">{payload[0].name}</p>
          <p className="tabular-nums mt-0.5">{fmt(payload[0].value)}</p>
          <p className="tabular-nums">{percentage}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={stacked ? 'space-y-5' : 'grid sm:grid-cols-[auto_1fr] gap-6 items-center'}>
      {/* Donut with total in center */}
      <div className={`relative w-[180px] h-[180px] mx-auto shrink-0 ${stacked ? '' : 'sm:mx-0'}`}>
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
              cornerRadius={4}
              {...anim}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} wrapperStyle={{ zIndex: 10 }} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-sm font-bold text-fg">{t('chart.total')}</span>
          <span className="mt-0.5 text-h3 font-extrabold tabular-nums text-fg">
            {fmt(total, { decimals: 0 })}
          </span>
        </div>
      </div>

      {/* Category list */}
      <div className="space-y-2.5">
        {data.slice(0, 6).map((entry, index) => {
          const pct = ((entry.value / total) * 100).toFixed(1);
          return (
            <div key={entry.name} className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="w-2.5 h-2.5 rounded-swatch flex-shrink-0"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-sm font-semibold text-fg flex-1 truncate">{entry.name}</span>
              <span className="text-sm font-extrabold text-fg tabular-nums">{fmt(entry.value, { decimals: 0 })}</span>
              <span className="text-sm font-semibold text-fg tabular-nums w-14 text-right">{pct}%</span>
            </div>
          );
        })}
        {data.length > 6 && (
          <p className="text-sm font-semibold text-fg pt-1 tabular-nums">+{data.length - 6}</p>
        )}
      </div>
    </div>
  );
}
