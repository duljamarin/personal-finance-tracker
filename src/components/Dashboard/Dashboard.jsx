import { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import UpgradeBanner from '../Subscription/UpgradeBanner';
import OnboardingChecklist from '../Onboarding/OnboardingChecklist';
import HealthScore from '../HealthScore/HealthScore';
import LoadingSpinner from '../UI/LoadingSpinner';
import SummaryCards from './SummaryCards';
import BudgetSummaryBar from './BudgetSummaryBar';
import ChartWithTimeRange from './ChartWithTimeRange';
import AddTransactionCTA from './AddTransactionCTA';
import { fetchBudgets } from '../../utils/api';

const Transactions = lazy(() => import('../Transactions/Transactions'));
const CategoryPieChart = lazy(() => import('../Transactions/CategoryPieChart'));
const CategoryBenchmark = lazy(() => import('../Benchmark/CategoryBenchmark'));

export default function Dashboard() {
  const { t } = useTranslation();
  const {
    transactions,
    categories,
    loading,
    error,
    totalIncome,
    totalExpense,
    net,
    hasMixedCurrencies,
  } = useTransactions();

  const [showGreeting, setShowGreeting] = useState(false);
  const [budgetCount, setBudgetCount] = useState(0);
  const username = localStorage.getItem('username');

  useEffect(() => {
    if (username) {
      setShowGreeting(true);
      const timer = setTimeout(() => setShowGreeting(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [username]);

  const refreshBudgetCount = useCallback(async () => {
    try {
      const now = new Date();
      const data = await fetchBudgets(now.getFullYear(), now.getMonth() + 1);
      setBudgetCount(data.length);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    refreshBudgetCount();
  }, [refreshBudgetCount]);

  const handleAddTransaction = () => {
    window.dispatchEvent(new CustomEvent('openAddTransaction'));
  };

  return (
    <>
      {/* Welcome greeting toast */}
      {showGreeting && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl text-base font-semibold animate-fade-in-out max-w-md text-center border border-white/20">
          <span className="text-2xl mr-2">👋</span>
          {t('dashboard.welcomeBack')}, {username}!
        </div>
      )}

      <UpgradeBanner />
      <OnboardingChecklist
        transactionCount={transactions.length}
        categoryCount={categories.length}
        budgetCount={budgetCount}
        onAddTransaction={handleAddTransaction}
      />

      {/* ═══ TIER 1: GLANCE — above the fold ═══ */}
      <section>
        <SummaryCards
          totalIncome={totalIncome}
          totalExpense={totalExpense}
          net={net}
          hasMixedCurrencies={hasMixedCurrencies}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <HealthScore compact onReloadTrigger={transactions.length} />
          <AddTransactionCTA onClick={handleAddTransaction} />
        </div>
      </section>

      {/* Tier divider */}
      <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

      {/* ═══ TIER 2: INSIGHT — one scroll ═══ */}
      <section>
        <BudgetSummaryBar />
        <ChartWithTimeRange transactions={transactions} />
      </section>

      {/* Tier divider */}
      <div className="my-8 border-t border-gray-200 dark:border-gray-700" />

      {/* ═══ TIER 3: DETAIL — intentional scroll ═══ */}
      <section>
        {/* Page-level error (non-auth) */}
        {error && (
          <div className="mb-4 sm:mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400 font-medium">
            {error}
          </div>
        )}

        <Suspense fallback={<LoadingSpinner size="md" text={t('dashboard.loadingData')} />}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-gray-600 dark:text-gray-300">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 dark:border-green-400 mr-3"></div>
              {t('dashboard.loadingData')}
            </div>
          ) : (
            <Transactions />
          )}

          {/* Income & Expense category breakdowns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-6 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-green-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-green-700 dark:text-green-400 flex items-center gap-2">
                <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                {t('transactions.incomes')} {t('chart.byCategory')}
              </h3>
              <CategoryPieChart transactions={transactions} type="income" />
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 sm:p-6 border border-red-100 dark:border-gray-700">
              <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4 text-red-700 dark:text-red-400 flex items-center gap-2">
                <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                {t('transactions.expenses')} {t('chart.byCategory')}
              </h3>
              <CategoryPieChart transactions={transactions} type="expense" />
            </div>
          </div>

          {/* Spending insights */}
          <CategoryBenchmark onReloadTrigger={transactions.length} />

          {/* Full Health Score with breakdowns */}
          <HealthScore onReloadTrigger={transactions.length} />
        </Suspense>
      </section>

      {/* Mobile FAB — Add Transaction */}
      <button
        onClick={handleAddTransaction}
        className="fixed bottom-6 right-6 z-40 md:hidden w-14 h-14 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full shadow-xl hover:shadow-2xl transition-all flex items-center justify-center active:scale-95"
        aria-label={t('dashboard.addTransaction')}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
