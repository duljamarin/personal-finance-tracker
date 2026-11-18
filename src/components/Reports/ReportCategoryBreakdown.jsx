import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import StackedBar from '../UI/StackedBar';
import ProgressBar from '../UI/ProgressBar';
import CategoryAvatar, { colorFromName } from '../UI/CategoryAvatar';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { delayStyle, rowDelay, dataDelay } from '../../utils/motion';

const STACK_TOP = 5;

/**
 * Category breakdown for a report period (spec 4.4): a StackedBar of the top
 * five categories (the rest grouped as Other) and one row per category with
 * its share. type="expense" (spending) or "income".
 */
export default function ReportCategoryBreakdown({ transactions, type = 'expense', index }) {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
  const titleKey = type === 'income' ? 'reports.incomeByCategory' : 'reports.categoryBreakdown';
  const emptyKey = type === 'income' ? 'reports.noIncome' : 'reports.noData';

  const categoryData = useMemo(() => {
    const totals = {};
    const cats = {};
    transactions
      .filter(tx => tx.type === type)
      .forEach(tx => {
        const cat = tx.categories || tx.category || null;
        const name = cat?.name || t('transactions.all');
        const amount = tx.base_amount ?? tx.amount ?? 0;
        totals[name] = (totals[name] || 0) + amount;
        if (cat && !cats[name]) cats[name] = cat;
      });

    const total = Object.values(totals).reduce((s, v) => s + v, 0);

    return Object.entries(totals)
      .map(([name, value]) => ({
        name,
        category: cats[name] || null,
        value: parseFloat(value.toFixed(2)),
        share: total > 0 ? value / total : 0,
        pct: total > 0 ? ((value / total) * 100).toFixed(1) : '0.0',
      }))
      .sort((a, b) => b.value - a.value);
  }, [transactions, t, type]);

  const total = categoryData.reduce((s, d) => s + d.value, 0);

  if (categoryData.length === 0) {
    return (
      <Card index={index}>
        <h2 className="text-h3 font-bold text-fg mb-gap">{t(titleKey)}</h2>
        <p className="tile-inner text-base font-semibold text-fg text-center py-8">{t(emptyKey)}</p>
      </Card>
    );
  }

  const head = categoryData.slice(0, STACK_TOP);
  const rest = categoryData.slice(STACK_TOP).reduce((s, d) => s + d.value, 0);
  const segments = [
    ...head.map(d => ({ key: d.name, label: translateCategoryName(d.name), value: d.value, color: colorFromName(d.name), display: fmt(d.value, { decimals: 0 }) })),
    ...(rest > 0 ? [{ key: 'other', label: t('dashboard.otherCategories'), value: rest, color: 'var(--inner-2)', display: fmt(rest, { decimals: 0 }) }] : []),
  ];
  const base = dataDelay(index || 0);

  return (
    <Card index={index} className="flex flex-col gap-gap">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 font-bold text-fg">{t(titleKey)}</h2>
        <span className="text-h3 font-extrabold tabular-nums text-fg">
          <span className="sr-only">{t('chart.total')}: </span>{fmt(total)}
        </span>
      </div>

      <StackedBar segments={segments} ariaLabel={t(titleKey)} delay={base} />

      <ul className="flex flex-col gap-1" aria-label={t('reports.category')}>
        {categoryData.map((entry, i) => (
          <li
            key={entry.name}
            className="activity-row animate-rise flex items-center gap-3 px-2 py-2.5 rounded-icon"
            style={delayStyle(rowDelay(i, base))}
          >
            <span className="activity-icon shrink-0">
              <CategoryAvatar category={entry.category} fallbackName={entry.name} />
            </span>
            <span className="flex-1 min-w-0">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-bold text-fg truncate">{translateCategoryName(entry.name)}</span>
                <span className="font-extrabold tabular-nums text-fg whitespace-nowrap">{fmt(entry.value)}</span>
              </span>
              <span className="mt-1 flex items-center gap-2.5">
                <ProgressBar ratio={entry.share} height={6} color={colorFromName(entry.name)} animate={false} className="max-w-[160px]" />
                <span className="text-sm font-semibold tabular-nums text-fg">{entry.pct}%</span>
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
