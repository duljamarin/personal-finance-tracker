import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2 } from 'lucide-react';
import Card from '../UI/Card';
import CategoryAvatar from '../UI/CategoryAvatar';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { progressColor } from '../../utils/chartColors';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { delayStyle, dataDelay } from '../../utils/motion';

/**
 * Forecast bar (spec 4.3): 14px track, spent fill in the state color, a
 * dashed WARNING extension up to the month-end projection when it exceeds
 * the limit, and a 2px --text marker at the limit.
 */
function ForecastBar({ spent, limit, projected, label, delay }) {
  const exceeds = projected > limit;
  const scale = Math.max(limit, spent, exceeds ? projected : 0) || 1;
  const pct = (v) => `${Math.min(100, (v / scale) * 100)}%`;
  const ratio = limit > 0 ? spent / limit : 0;
  return (
    <div className="relative h-3.5 mt-2" role="img" aria-label={label}>
      <div className="absolute inset-0 rounded-pill bg-inner-2 overflow-hidden">
        <div
          className="h-full rounded-pill origin-left animate-grow-x bar-w"
          style={{ width: pct(spent), backgroundColor: progressColor(ratio), ...delayStyle(delay) }}
        />
      </div>
      {exceeds && spent < projected && (
        <div
          className="absolute top-0 bottom-0 border-2 border-dashed border-l-0 rounded-r-pill"
          style={{ left: pct(spent), width: `calc(${pct(projected)} - ${pct(spent)})`, borderColor: 'var(--c-warning)' }}
          aria-hidden="true"
        />
      )}
      {limit > 0 && limit < scale && (
        <div className="absolute -top-1.5 -bottom-1.5 w-[2px] rounded-swatch bg-fg" style={{ left: pct(limit) }} aria-hidden="true" />
      )}
    </div>
  );
}

// One budget as a tile (BudgetsPage renders them on the grid).
export default memo(function BudgetCard({ budget, spent, isCurrentMonth, isFutureMonth, onEdit, onDelete, index }) {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();

  const budgetAmount = Number(budget.amount) || 0;
  const spentAmount = Number(spent) || 0;
  const ratio = budgetAmount > 0 ? spentAmount / budgetAmount : 0;
  const percentUsed = Math.round(ratio * 100);
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
  const name = translateCategoryName(budget.category?.name || '');
  const iconBtn = 'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner';

  return (
    <Card index={index} className="group flex flex-col">
      <div className="flex items-center gap-[14px]">
        <CategoryAvatar category={budget.category} size="lg" />
        <h3 className="flex-1 min-w-0 [overflow-wrap:anywhere] text-h3 font-bold text-fg">{name}</h3>
        <div className="flex shrink-0 -mr-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
          <button type="button" onClick={() => onEdit(budget)} className={iconBtn} title={t('budgets.editBudget')} aria-label={t('budgets.editBudget')}>
            <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onDelete(budget)} className={`${iconBtn} hover:text-danger`} title={t('budgets.deleteConfirm')} aria-label={t('budgets.delete.title')}>
            <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <p className="mt-3 flex items-baseline justify-between gap-3 text-sm font-semibold text-fg tabular-nums">
        <span><span className="text-h3 font-extrabold">{fmt(spentAmount)}</span> / {fmt(budgetAmount)}</span>
        <span className={`text-h3 font-extrabold ${isOverBudget ? 'text-expense' : ''}`}>{percentUsed}%</span>
      </p>

      <ForecastBar
        spent={spentAmount}
        limit={budgetAmount}
        projected={forecast ? forecast.projected : spentAmount}
        delay={dataDelay(index || 0)}
        label={t('budgets.forecastBar', {
          spent: fmt(spentAmount),
          limit: fmt(budgetAmount),
          projected: fmt(forecast ? forecast.projected : spentAmount),
        })}
      />

      {/* Over-budget hierarchy: the % above carries the red; these lines stay quiet. */}
      <div className="mt-3 flex flex-col gap-0.5 text-sm font-semibold text-fg">
        <span className="tabular-nums">
          {isOverBudget
            ? t('budgets.card.over', { amount: fmt(Math.abs(remaining)) })
            : t('budgets.card.left', { amount: fmt(remaining) })}
        </span>
        {forecast && (
          <span className={`tabular-nums ${forecast.willExceed ? 'text-warning font-bold' : ''}`}>
            {forecast.willExceed
              ? t('budgets.forecast.willExceed', { amount: fmt(forecast.exceedBy) })
              : t('budgets.forecast.onTrack', { amount: fmt(forecast.projected) })}
          </span>
        )}
        {isFutureMonth && <span>{t('budgets.forecast.notStarted')}</span>}
      </div>
    </Card>
  );
});
