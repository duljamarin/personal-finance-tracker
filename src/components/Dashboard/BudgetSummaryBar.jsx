import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchBudgets, fetchMonthlyExpensesByCategory } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useAsyncData } from '../../hooks/useAsyncData';
import Card from '../UI/Card';
import { progressColor } from '../../utils/chartColors';
import { formatMonthName } from '../../utils/date';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

export default function BudgetSummaryBar({ maxItems = 5, reloadTrigger }) {
  const { t, i18n } = useTranslation();
  const { format: formatCurrency } = useDisplayCurrency();
    const now = new Date();
  const monthLabel = formatMonthName(now, i18n.language);

  const { data, loading } = useAsyncData(
    async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      const [budgetData, expenseData] = await Promise.all([
        fetchBudgets(year, month),
        fetchMonthlyExpensesByCategory(year, month)
      ]);
      return { budgets: budgetData, expenses: expenseData };
    },
    [reloadTrigger],
    { budgets: [], expenses: {} }
  );
  const { budgets, expenses } = data;

  const getProgressColor = (ratio) => progressColor(ratio);

  if (loading) {
    // Skeleton mirrors the loaded card's padding (p-4 sm:p-6) and row shape
    // (label line + progress bar) so the card doesn't resize when data lands.
    return (
      <Card padding="none">
        <div className="p-4 sm:p-5 min-h-[180px]">
          <div className="animate-pulse">
            <div className="h-6 bg-surface-hairline dark:bg-surface-dark-hairline rounded w-1/3 mb-4"></div>
            <div className="space-y-3.5">
              {[1, 2, 3].map(i => (
                <div key={i}>
                  <div className="h-4 bg-surface-hairline dark:bg-surface-dark-hairline rounded w-1/2 mb-1"></div>
                  <div className="h-2 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full w-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card padding="none">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-heading text-ink-primary dark:text-white">
              {t('dashboard.budgetProgress')}
              <span className="ml-2 text-xs font-medium text-ink-muted dark:text-white capitalize">{monthLabel}</span>
            </h2>
            <Link to="/budgets" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium">
              {t('dashboard.setupBudgets')}
            </Link>
          </div>
          <p className="text-sm text-ink-muted dark:text-white mt-2">{t('dashboard.noBudgets')}</p>
        </div>
      </Card>
    );
  }

  const displayed = budgets.slice(0, maxItems);

  return (
    <Card padding="none">
      <div className="p-4 sm:p-5 min-h-[180px]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-heading text-ink-primary dark:text-white">
            {t('dashboard.budgetProgress')}
            <span className="ml-2 text-xs font-medium text-ink-muted dark:text-white capitalize">{monthLabel}</span>
          </h2>
          <Link to="/budgets" className="text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium">
            {t('dashboard.viewAllBudgets')}
          </Link>
        </div>

        <div className="space-y-3.5">
          {displayed.map(budget => {
            const budgetAmount = Number(budget.amount) || 0;
            const spent = Number(expenses[budget.category_id]) || 0;
            const ratio = budgetAmount > 0 ? spent / budgetAmount : 0;
            const percentUsed = Math.round(ratio * 100);
            const displayPercent = Math.min(percentUsed, 100);

            return (
              <div key={budget.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink-primary dark:text-white font-medium truncate">
                    {translateCategoryName(budget.category?.name || '')}
                  </span>
                  <span className="text-xs text-ink-muted dark:text-white ml-2 whitespace-nowrap tabular-nums">
                    <span className="font-medium text-ink-primary dark:text-white">{formatCurrency(spent, { decimals: 0 })}</span>
                    {' / '}{formatCurrency(budgetAmount, { decimals: 0 })}
                    <span className={`ml-1.5 ${ratio >= 1 ? 'text-expense font-semibold' : ''}`}>{percentUsed}%</span>
                  </span>
                </div>
                <div className="w-full bg-surface-hairline dark:bg-surface-dark-hairline rounded-full h-1.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${displayPercent}%`, backgroundColor: getProgressColor(ratio) }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {budgets.length > maxItems && (
          <Link to="/budgets" className="block text-center text-sm text-brand-600 dark:text-brand-400 hover:underline font-medium mt-3">
            +{budgets.length - maxItems} {t('dashboard.viewAllBudgets')}
          </Link>
        )}
      </div>
    </Card>
  );
}
