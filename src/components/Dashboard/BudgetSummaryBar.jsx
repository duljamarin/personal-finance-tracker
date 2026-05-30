import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchBudgets, fetchMonthlyExpensesByCategory } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useAsyncData } from '../../hooks/useAsyncData';
import Card from '../UI/Card';

export default function BudgetSummaryBar({ maxItems = 5, reloadTrigger }) {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'sq' ? 'sq-AL' : 'en-US';
  const now = new Date();
  const monthLabel = now.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });

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

  const getProgressColor = (ratio) => {
    if (ratio >= 1.0) return '#e8394d';
    if (ratio >= 0.9) return '#d97706';
    if (ratio >= 0.7) return '#ca8a04';
    return '#168b78';
  };

  if (loading) {
    // Skeleton mirrors the loaded card's padding (p-4 sm:p-6) and row shape
    // (label line + progress bar) so the card doesn't resize when data lands.
    return (
      <Card className="mb-6" padding="none">
        <div className="p-4 sm:p-6 min-h-[180px]">
          <div className="animate-pulse">
            <div className="h-6 bg-surface-hairline dark:bg-surface-dark-hairline rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
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
      <Card className="mb-6" padding="none">
        <div className="p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold tracking-tight text-base text-ink-primary dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('dashboard.budgetProgress')} - {monthLabel}
            </h3>
            <Link to="/budgets" className="text-sm text-brand-600 dark:text-brand-500 hover:underline font-medium">
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
    <Card className="mb-6">
      <div className="p-4 sm:p-6 min-h-[180px]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold tracking-tight text-base text-ink-primary dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-brand-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('dashboard.budgetProgress')} - {monthLabel}
          </h3>
          <Link to="/budgets" className="text-sm text-brand-600 dark:text-brand-500 hover:underline font-medium">
            {t('dashboard.viewAllBudgets')}
          </Link>
        </div>

        <div className="space-y-3">
          {displayed.map(budget => {
            const budgetAmount = Number(budget.amount) || 0;
            const spent = Number(expenses[budget.category_id]) || 0;
            const ratio = budgetAmount > 0 ? spent / budgetAmount : 0;
            const percentUsed = Math.round(ratio * 100);
            const displayPercent = Math.min(percentUsed, 100);

            return (
              <div key={budget.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-ink-secondary dark:text-white font-medium truncate">
                    {translateCategoryName(budget.category?.name || '')}
                  </span>
                  <span className="text-xs text-ink-muted dark:text-white ml-2 whitespace-nowrap">
                    <span className={ratio >= 1 ? 'text-[#e8394d] dark:text-[#e8394d] font-semibold' : ''}>
                      &euro;{spent.toFixed(0)}
                    </span>
                    {' / '}&euro;{budgetAmount.toFixed(0)}
                    <span className="ml-1 text-ink-muted dark:text-white">({percentUsed}%)</span>
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
          <Link to="/budgets" className="block text-center text-sm text-brand-600 dark:text-brand-500 hover:underline font-medium mt-3">
            +{budgets.length - maxItems} {t('dashboard.viewAllBudgets')}
          </Link>
        )}
      </div>
    </Card>
  );
}
