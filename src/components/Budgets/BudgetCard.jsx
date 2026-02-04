import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import { translateCategoryName } from '../../utils/categoryTranslation';

export default function BudgetCard({ budget, spent, isCurrentMonth, isFutureMonth, onEdit, onDelete }) {
  const { t } = useTranslation();

  const budgetAmount = Number(budget.amount) || 0;
  const spentAmount = Number(spent) || 0;
  const ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
  const percentUsed = Math.round(ratio * 100);
  const displayPercent = Math.min(percentUsed, 100);
  const remaining = budgetAmount - spentAmount;
  const isOverBudget = spentAmount > budgetAmount;

  const getProgressColor = () => {
    if (ratio >= 1.0) return 'bg-red-500';
    if (ratio >= 0.9) return 'bg-orange-500';
    if (ratio >= 0.7) return 'bg-yellow-500';
    return 'bg-green-500';
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
          <h3 className="text-lg font-bold text-gray-800 dark:text-white">
            {translateCategoryName(budget.category?.name || '')}
          </h3>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(budget)}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title={t('budgets.editBudget')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(budget)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
              title={t('budgets.deleteConfirm')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Spent / Budget amounts */}
        <div className="flex justify-between text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">
            <span className={isOverBudget ? 'text-red-600 dark:text-red-400 font-semibold' : 'font-semibold text-gray-800 dark:text-white'}>
              €{spentAmount.toFixed(2)}
            </span>
            {' '}{t('budgets.card.spent')} {t('budgets.card.of')} €{budgetAmount.toFixed(2)}
          </span>
          <span className={`font-semibold ${isOverBudget ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
            {percentUsed}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden mb-1">
          <div
            className={`h-full ${getProgressColor()} transition-all duration-300`}
            style={{ width: `${displayPercent}%` }}
          />
        </div>

        {/* Overflow indicator */}
        {isOverBudget && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium mt-1">
            €{Math.abs(remaining).toFixed(2)} {t('budgets.card.overflow')}
          </p>
        )}

        {/* Remaining (when not over budget) */}
        {!isOverBudget && (
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            €{remaining.toFixed(2)} {t('budgets.card.remaining')}
          </p>
        )}

        {/* Forecast line */}
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600">
          {forecast && (
            <p className={`text-sm font-medium ${forecast.willExceed ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}>
              {forecast.willExceed
                ? t('budgets.forecast.willExceed', { amount: forecast.exceedBy.toFixed(2) })
                : t('budgets.forecast.onTrack', { amount: forecast.projected.toFixed(2) })
              }
            </p>
          )}
          {isFutureMonth && (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('budgets.forecast.notStarted')}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
