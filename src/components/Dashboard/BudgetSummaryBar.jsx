import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchBudgets, fetchMonthlyExpensesByCategory } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import Card from '../UI/Card';

export default function BudgetSummaryBar({ maxItems = 5 }) {
  const { t } = useTranslation();
  const [budgets, setBudgets] = useState([]);
  const [expenses, setExpenses] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const [budgetData, expenseData] = await Promise.all([
          fetchBudgets(year, month),
          fetchMonthlyExpensesByCategory(year, month)
        ]);
        setBudgets(budgetData);
        // Build map: category_id -> spent amount
        const map = {};
        for (const row of expenseData) {
          const catId = row.category_id;
          map[catId] = (map[catId] || 0) + Number(row.base_amount || 0);
        }
        setExpenses(map);
      } catch {
        // silent fail — budget bar is supplementary
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const getProgressColor = (ratio) => {
    if (ratio >= 1.0) return 'bg-red-500';
    if (ratio >= 0.9) return 'bg-amber-500';
    if (ratio >= 0.7) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <div className="p-4 sm:p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-5 bg-gray-200 dark:bg-gray-600 rounded w-1/3"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card className="mb-6">
        <div className="p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('dashboard.budgetProgress')}
            </h3>
            <Link to="/budgets" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
              {t('dashboard.setupBudgets')}
            </Link>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{t('dashboard.noBudgets')}</p>
        </div>
      </Card>
    );
  }

  const displayed = budgets.slice(0, maxItems);

  return (
    <Card className="mb-6">
      <div className="p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <svg className="w-5 h-5 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('dashboard.budgetProgress')}
          </h3>
          <Link to="/budgets" className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium">
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
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium truncate">
                    {translateCategoryName(budget.category?.name || '')}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 whitespace-nowrap">
                    <span className={ratio >= 1 ? 'text-red-600 dark:text-red-400 font-semibold' : ''}>
                      &euro;{spent.toFixed(0)}
                    </span>
                    {' / '}&euro;{budgetAmount.toFixed(0)}
                    <span className="ml-1 text-gray-400">({percentUsed}%)</span>
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full ${getProgressColor(ratio)} rounded-full transition-all duration-300`}
                    style={{ width: `${displayPercent}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {budgets.length > maxItems && (
          <Link to="/budgets" className="block text-center text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium mt-3">
            +{budgets.length - maxItems} {t('dashboard.viewAllBudgets')}
          </Link>
        )}
      </div>
    </Card>
  );
}
