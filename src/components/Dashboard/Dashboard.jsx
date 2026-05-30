import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { fetchCategories, addCategory, bulkImportTransactions } from '../../utils/api';
import UpgradeBanner from '../Subscription/UpgradeBanner';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import HealthScore from '../HealthScore/HealthScore';
import LoadingSpinner from '../UI/LoadingSpinner';
import SummaryCards from './SummaryCards';
import BudgetSummaryBar from './BudgetSummaryBar';
import ChartWithTimeRange from './ChartWithTimeRange';
import AddTransactionCTA from './AddTransactionCTA';
import CashFlowForecast from './CashFlowForecast';
import FirstRunGuide from './FirstRunGuide';

const Transactions = lazy(() => import('../Transactions/Transactions'));
const CategoryPieChart = lazy(() => import('../Transactions/CategoryPieChart'));
const CategoryBenchmark = lazy(() => import('../Benchmark/CategoryBenchmark'));

function getTimeGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.goodMorning');
  if (hour < 17) return t('dashboard.goodAfternoon');
  return t('dashboard.goodEvening');
}

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const isSq = i18n.language === 'sq';
  const formatTodayLabel = () => {
    const d = new Date();
    if (!isSq) {
      return d.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    const weekdays = ['E diel', 'E hënë', 'E martë', 'E mërkurë', 'E enjte', 'E premte', 'E shtunë'];
    const months = ['janar', 'shkurt', 'mars', 'prill', 'maj', 'qershor', 'korrik', 'gusht', 'shtator', 'tetor', 'nëntor', 'dhjetor'];
    return `${weekdays[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  };
  const {
    transactions,
    loading,
    error,
    totalIncome,
    totalExpense,
    net,
    hasMixedCurrencies,
    mutationCount,
    reloadTransactions,
  } = useTransactions();

  const { monthlyTransactionCount, transactionLimit } = useSubscription();

  // Import demo transactions if the user saved them before signing in.
  // Falls back to localStorage for the email-confirmation flow where the
  // confirmation link opens in a new tab (sessionStorage is tab-scoped).
  const demoImportedRef = useRef(false);
  useEffect(() => {
    if (demoImportedRef.current) return;
    const raw =
      sessionStorage.getItem('demo_pending_import') ||
      localStorage.getItem('demo_pending_import');
    if (!raw) return;
    demoImportedRef.current = true;
    sessionStorage.removeItem('demo_pending_import');
    localStorage.removeItem('demo_pending_import');
    (async () => {
      try {
        const demoTxs = JSON.parse(raw);
        if (!Array.isArray(demoTxs) || demoTxs.length === 0) return;

        const cats = await fetchCategories();
        const catMap = new Map(cats.map((c) => [c.name, c.id]));

        const missingNames = [...new Set(demoTxs.map((tx) => tx.category).filter(Boolean))].filter(
          (name) => !catMap.has(name),
        );
        await Promise.all(
          missingNames.map(async (name) => {
            const created = await addCategory({ name });
            catMap.set(name, created.id);
          }),
        );

        const rows = demoTxs.map((tx) => ({
          title: tx.title,
          amount: tx.amount,
          type: tx.type,
          date: tx.date,
          category_id: catMap.get(tx.category) ?? null,
          currency_code: 'EUR',
          exchange_rate: 1.0,
        }));

        await bulkImportTransactions(rows);
        await reloadTransactions();
      } catch {
        // Silent — demo import must not disrupt the dashboard
      }
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const [showGreeting, setShowGreeting] = useState(false);
  const username = localStorage.getItem('username');

  useEffect(() => {
    // Only show greeting once per browser session, not on every navigation to this page
    if (username && !sessionStorage.getItem('greetingShown')) {
      sessionStorage.setItem('greetingShown', '1');
      setShowGreeting(true);
      const timer = setTimeout(() => setShowGreeting(false), 3500);
      return () => clearTimeout(timer);
    }
  }, [username]);

  const handleAddTransaction = () => {
    window.dispatchEvent(new CustomEvent('openAddTransaction'));
  };

  return (
    <>
      {/* Welcome greeting toast */}
      {showGreeting && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-600 text-white px-5 py-3 rounded-md shadow-lg shadow-brand-500/30 text-sm font-medium animate-fade-in-out max-w-sm text-center">
          {t('dashboard.welcomeBack')}, {username}!
        </div>
      )}

      <UpgradeBanner />

      {/* Transaction usage counter (free plan only, shows when >= 50% used) */}
      <div className="mb-4">
        <FreePlanUsageCounter
          used={monthlyTransactionCount}
          limit={transactionLimit}
          labelKey="freePlanCounter.transactions"
          threshold={0.5}
        />
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-ink-primary dark:text-white tracking-tight">
            {username ? `${getTimeGreeting(t)}, ${username}` : t('dashboard.title')}
          </h1>
          <p className="text-sm text-ink-muted dark:text-white mt-0.5">
            {formatTodayLabel()}
          </p>
        </div>
        <button
          onClick={handleAddTransaction}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          {t('dashboard.addTransaction')}
        </button>
      </div>

      {/* Summary cards */}
      <SummaryCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        net={net}
        hasMixedCurrencies={hasMixedCurrencies}
        loading={loading}
      />

      {!loading && transactions.length === 0 ? (
        <FirstRunGuide onAddTransaction={handleAddTransaction} />
      ) : (
        <>
          <div className="mt-6">
            <AddTransactionCTA onClick={handleAddTransaction} />
          </div>

          {/* Reserve height so this block (each child loads its own data async)
              doesn't shove the page/footer down as it fills in — main field-CLS
              source on the dashboard (sel. div.mt-8.space-y-6, 0.749). */}
          <div className="mt-8 space-y-6 min-h-[600px]">
            <BudgetSummaryBar reloadTrigger={totalExpense} />
            <ChartWithTimeRange transactions={transactions} />
            <CashFlowForecast />
          </div>
        </>
      )}

      <div className="mt-8">
        {error && (
          <div className="mb-6 p-4 bg-[#fdf2f4] dark:bg-[rgba(232,57,77,0.12)] border border-[#e8394d]/30 rounded-xl text-[#e8394d] font-medium text-sm">
            {error}
          </div>
        )}

        <Suspense fallback={<LoadingSpinner size="md" text={t('dashboard.loadingData')} />}>
          {loading ? (
            <div className="flex items-center justify-center py-12 text-ink-primary dark:text-white">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 dark:border-brand-400 mr-3"></div>
              {t('dashboard.loadingData')}
            </div>
          ) : (
            <Transactions />
          )}

          {/* Category breakdowns side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6 mb-6">
            <div className="bg-white dark:bg-surface-dark-card rounded-[10px] p-6 sm:p-7 border border-surface-hairline dark:border-surface-dark-hairline">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-ink-primary dark:text-white tracking-tight">
                  {t('transactions.incomes')} {t('chart.byCategory')}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 rounded">
                  {t('transactions.incomes')}
                </span>
              </div>
              <CategoryPieChart transactions={transactions} type="income" />
            </div>
            <div className="bg-white dark:bg-surface-dark-card rounded-[10px] p-6 sm:p-7 border border-surface-hairline dark:border-surface-dark-hairline">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-semibold text-ink-primary dark:text-white tracking-tight">
                  {t('transactions.expenses')} {t('chart.byCategory')}
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] bg-surface-hairline dark:bg-surface-dark-hairline text-ink-muted dark:text-white rounded">
                  {t('transactions.expenses')}
                </span>
              </div>
              <CategoryPieChart transactions={transactions} type="expense" />
            </div>
          </div>

          <CategoryBenchmark onReloadTrigger={mutationCount} />
          <HealthScore onReloadTrigger={mutationCount} />
        </Suspense>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={handleAddTransaction}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-md shadow-lg transition-all flex items-center justify-center active:scale-95"
        aria-label={t('dashboard.addTransaction')}
      >
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </>
  );
}
