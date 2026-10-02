import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { fetchCategories, addCategory, bulkImportTransactions } from '../../utils/api';
import EncryptionPromptBanner from '../Encryption/EncryptionPromptBanner';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import { QUOTA_VISIBLE_AT } from '../../config/app';
import HealthScore from '../HealthScore/HealthScore';
import SummaryCards from './SummaryCards';
import BudgetSummaryBar from './BudgetSummaryBar';
import ChartWithTimeRange from './ChartWithTimeRange';
import CashFlowForecast from './CashFlowForecast';
import FirstRunGuide from './FirstRunGuide';
import { Plus } from 'lucide-react';

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
  // Prefix match, not equality: `sq-AL` is Albanian too (see getDateLocale).
  const isSq = (i18n.language || '').toLowerCase().startsWith('sq');
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
    mutationCount,
    reloadTransactions,
  } = useTransactions();

  const { monthlyTransactionCount, transactionLimit } = useSubscription();


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
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-brand-600 text-white px-5 py-3 rounded-md shadow-tier2 text-sm font-medium animate-fade-in-out max-w-sm text-center">
          {t('dashboard.welcomeBack')}, {username}!
        </div>
      )}

      <EncryptionPromptBanner />

      {/* Transaction usage counter (free plan only). Hidden entirely until the
          user is QUOTA_VISIBLE_AT transactions in — below that it is noise, and
          showing a cap before any value has been delivered reads as a paywall.
          The sidebar plan card is the single permanent upgrade surface.
          No scopeNote needed: the label itself already says "this month". */}
      {monthlyTransactionCount >= QUOTA_VISIBLE_AT && (
        <div className="mb-4">
          <FreePlanUsageCounter
            used={monthlyTransactionCount}
            limit={transactionLimit}
            labelKey="freePlanCounter.transactions"
          />
        </div>
      )}

      {/* Page header */}
      <div className="flex items-end justify-between gap-4 mb-6">
        <div className="min-w-0">
          <p className="text-sm text-ink-muted dark:text-white">{formatTodayLabel()}</p>
          <h1 className="mt-1 text-title font-display text-ink-primary dark:text-white truncate">
            {username ? `${getTimeGreeting(t)}, ${username}` : t('dashboard.title')}
          </h1>
        </div>
        <button
          onClick={handleAddTransaction}
          className="hidden sm:inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-600 hover:bg-brand-700 rounded-md transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" strokeWidth={2} />
          {t('dashboard.addTransaction')}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-expense-bg border border-expense/30 rounded-container text-expense font-medium text-sm">
          {error}
        </div>
      )}

      <SummaryCards
        totalIncome={totalIncome}
        totalExpense={totalExpense}
        net={net}
        loading={loading}
        transactions={transactions}
      />

      {!loading && transactions.length === 0 && (
        <div className="mt-6">
          <FirstRunGuide onAddTransaction={handleAddTransaction} />
        </div>
      )}

      {/* Overview grid. The main column carries the trend and the ledger; the
          side column the "am I on track" signals. Reserved min-height keeps
          the async children from pushing the footer around (CLS). */}
      <Suspense fallback={<div className="mt-6 min-h-[600px]" />}>
        {(loading || transactions.length > 0) && (
          <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 items-start min-h-[600px]">
            <div className="lg:col-span-2 space-y-6 min-w-0">
              <ChartWithTimeRange transactions={transactions} />
              {loading ? (
                <div className="flex items-center justify-center py-12 text-sm text-ink-primary dark:text-white bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600 dark:border-brand-400 mr-3"></div>
                  {t('dashboard.loadingData')}
                </div>
              ) : (
                <Transactions variant="recent" limit={8} />
              )}
            </div>

            <div className="space-y-6 min-w-0">
              <BudgetSummaryBar reloadTrigger={totalExpense} />
              <div className="bg-white dark:bg-surface-dark-card rounded-container p-4 sm:p-5 border border-surface-hairline dark:border-surface-dark-hairline">
                <div className="flex items-baseline justify-between mb-4">
                  <h2 className="text-heading text-ink-primary dark:text-white">{t('dashboard.spendingByCategory')}</h2>
                  <span className="text-xs text-ink-muted dark:text-white">{t('dashboard.allTime')}</span>
                </div>
                {/* Own Suspense boundary: mounting alongside the transaction
                    list let ResponsiveContainer measure 0x0 mid-layout and
                    never redraw. Fallback matches the chart's height. */}
                <Suspense fallback={<div className="min-h-[180px]" />}>
                  <CategoryPieChart transactions={transactions} type="expense" layout="stacked" />
                </Suspense>
              </div>
            </div>
          </div>
        )}

        {/* Mounted even with no transactions: it owns the add-transaction
            drawer that FirstRunGuide and the header button open. */}
        {!loading && transactions.length === 0 && <Transactions variant="recent" />}

        {!loading && transactions.length > 0 && (
          <div className="mt-6 space-y-6">
            <CashFlowForecast />
            <div className="bg-white dark:bg-surface-dark-card rounded-container p-4 sm:p-5 border border-surface-hairline dark:border-surface-dark-hairline">
              <div className="flex items-baseline justify-between mb-4">
                <h2 className="text-heading text-ink-primary dark:text-white">{t('dashboard.incomeBySource')}</h2>
                <span className="text-xs text-ink-muted dark:text-white">{t('dashboard.allTime')}</span>
              </div>
              <Suspense fallback={<div className="min-h-[180px]" />}>
                <CategoryPieChart transactions={transactions} type="income" />
              </Suspense>
            </div>
          </div>
        )}

        <div className="mt-6">
          <CategoryBenchmark onReloadTrigger={mutationCount} />
          <HealthScore onReloadTrigger={mutationCount} />
        </div>
      </Suspense>

      {/* Mobile FAB */}
      <button
        onClick={handleAddTransaction}
        className="fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-md shadow-lg transition-all flex items-center justify-center active:scale-95"
        aria-label={t('dashboard.addTransaction')}
      >
        <Plus className="w-6 h-6" strokeWidth={2.25} />
      </button>
    </>
  );
}
