import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import CategoryAvatar from '../UI/CategoryAvatar';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { progressColor } from '../../utils/chartColors';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

// One budget as a list row (rendered inside BudgetsPage's divided list).
export default memo(function BudgetCard({ budget, spent, isCurrentMonth, isFutureMonth, onEdit, onDelete }) {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();

  const budgetAmount = Number(budget.amount) || 0;
  const spentAmount = Number(spent) || 0;
  const ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
  const percentUsed = Math.round(ratio * 100);
  const displayPercent = Math.min(percentUsed, 100);
  const remaining = budgetAmount - spentAmount;
  const isOverBudget = spentAmount > budgetAmount;

  // Forecast calculation for the current month
  const getForecast = () => {
    if (!isCurrentMonth) return null;
    const today = new Date();
    const daysElapsed = Math.max(1, today.getDate());
    const daysInMonth = new Date(budget.year, budget.month, 0).getDate();
    const projected = (spentAmount / daysElapsed) * daysInMonth;
    return { projected, willExceed: projected > budgetAmount, exceedBy: projected - budgetAmount };
  };

  const forecast = getForecast();

  return (
    <div className="group flex items-start gap-3 px-4 sm:px-5 py-4 bg-white dark:bg-surface-dark-card">
      <CategoryAvatar category={budget.category} />

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-ink-primary dark:text-white">
            {translateCategoryName(budget.category?.name || '')}
          </h3>
          <span className="shrink-0 text-sm tabular-nums text-ink-muted dark:text-white">
            <span className="font-semibold text-ink-primary dark:text-white">{fmt(spentAmount)}</span>
            {' / '}{fmt(budgetAmount)}
          </span>
        </div>

        <div className="mt-2 flex items-center gap-3">
          <div className="flex-1 h-1.5 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{ width: `${displayPercent}%`, backgroundColor: progressColor(ratio) }}
            />
          </div>
          <span className={`w-10 text-right text-xs font-semibold tabular-nums ${isOverBudget ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
            {percentUsed}%
          </span>
        </div>

        {/* Over-budget hierarchy: the % above carries the red; this line stays quiet. */}
        <div className="mt-1.5 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-xs text-ink-muted dark:text-white">
          <span className="tabular-nums">
            {isOverBudget
              ? t('budgets.card.over', { amount: fmt(Math.abs(remaining)) })
              : t('budgets.card.left', { amount: fmt(remaining) })}
          </span>
          {forecast && (
            <span className={`tabular-nums ${forecast.willExceed ? 'text-expense' : ''}`}>
              {forecast.willExceed
                ? t('budgets.forecast.willExceed', { amount: fmt(forecast.exceedBy) })
                : t('budgets.forecast.onTrack', { amount: fmt(forecast.projected) })}
            </span>
          )}
          {isFutureMonth && <span>{t('budgets.forecast.notStarted')}</span>}
        </div>
      </div>

      <div className="flex gap-0.5 shrink-0 -mr-1.5 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
        <button
          onClick={() => onEdit(budget)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-ink-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
          title={t('budgets.editBudget')}
          aria-label={t('budgets.editBudget')}
        >
          <Pencil className="w-4 h-4" strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onDelete(budget)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-expense dark:hover:text-expense hover:bg-expense/5 transition-colors"
          title={t('budgets.deleteConfirm')}
          aria-label={t('budgets.delete.title')}
        >
          <Trash2 className="w-4 h-4" strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
});
