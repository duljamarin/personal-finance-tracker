import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Icon from '../UI/Icon';
import { translateCategoryName } from '../../utils/categoryTranslation';

export default memo(function BudgetCard({ budget, spent, isCurrentMonth, isFutureMonth, onEdit, onDelete }) {
  const { t } = useTranslation();

  const budgetAmount = Number(budget.amount) || 0;
  const spentAmount = Number(spent) || 0;
  const ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
  const percentUsed = Math.round(ratio * 100);
  const displayPercent = Math.min(percentUsed, 100);
  const remaining = budgetAmount - spentAmount;
  const isOverBudget = spentAmount > budgetAmount;

  const getProgressColor = () => {
    if (ratio >= 1.0) return '#e05c6b';
    if (ratio >= 0.9) return '#d97706';
    if (ratio >= 0.7) return '#ca8a04';
    return '#168b78';
  };

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
    <Card>
      <div className="p-4 sm:p-6">
        {/* Header: category name + action buttons */}
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-display font-semibold tracking-tight text-lg text-ink-primary dark:text-ink-dark-primary">
            {translateCategoryName(budget.category?.name || '')}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(budget)}
              className="p-2 text-ink-muted dark:text-ink-dark-muted hover:text-brand-600 dark:hover:text-brand-500 transition"
              title={t('budgets.editBudget')}
            >
              <Icon name="edit" />
            </button>
            <button
              onClick={() => onDelete(budget)}
              className="p-2 text-ink-muted dark:text-ink-dark-muted hover:text-[#e05c6b] dark:hover:text-[#f08090] transition"
              title={t('budgets.deleteConfirm')}
            >
              <Icon name="delete" />
            </button>
          </div>
        </div>

        {/* Spent / Budget amounts */}
        <div className="flex justify-between text-sm mb-2">
          <span className="text-ink-secondary dark:text-ink-dark-secondary">
            <span className={isOverBudget ? 'text-[#e05c6b] dark:text-[#f08090] font-semibold' : 'font-semibold text-ink-primary dark:text-ink-dark-primary'}>
              €{spentAmount.toFixed(2)}
            </span>
            {' '}{t('budgets.card.spent')} {t('budgets.card.of')} €{budgetAmount.toFixed(2)}
          </span>
          <span className={`font-semibold ${isOverBudget ? 'text-[#e05c6b] dark:text-[#f08090]' : 'text-ink-secondary dark:text-ink-dark-secondary'}`}>
            {percentUsed}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-surface-hairline dark:bg-surface-dark-hairline rounded-full h-2.5 overflow-hidden mb-1">
          <div
            className="h-full transition-all duration-300"
            style={{ width: `${displayPercent}%`, backgroundColor: getProgressColor() }}
          />
        </div>

        {/* Overflow indicator */}
        {isOverBudget && (
          <p className="text-xs text-[#e05c6b] dark:text-[#f08090] font-medium mt-1">
            €{Math.abs(remaining).toFixed(2)} {t('budgets.card.overflow')}
          </p>
        )}

        {/* Remaining (when not over budget) */}
        {!isOverBudget && (
          <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-1">
            €{remaining.toFixed(2)} {t('budgets.card.remaining')}
          </p>
        )}

        {/* Forecast line */}
        <div className="mt-3 pt-3 border-t border-surface-hairline dark:border-surface-dark-hairline">
          {forecast && (
            <p className={`text-sm font-medium ${forecast.willExceed ? 'text-[#e05c6b] dark:text-[#f08090]' : 'text-brand-600 dark:text-brand-500'}`}>
              {forecast.willExceed
                ? t('budgets.forecast.willExceed', { amount: forecast.exceedBy.toFixed(2) })
                : t('budgets.forecast.onTrack', { amount: forecast.projected.toFixed(2) })
              }
            </p>
          )}
          {isFutureMonth && (
            <p className="text-sm text-ink-muted dark:text-ink-dark-muted">
              {t('budgets.forecast.notStarted')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
});
