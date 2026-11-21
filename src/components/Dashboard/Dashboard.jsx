import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { fetchBudgets, fetchMonthlyExpensesByCategory, fetchHealthScore, fetchHealthScoreHistory, fetchGoals } from '../../utils/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import EncryptionPromptBanner from '../Encryption/EncryptionPromptBanner';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import { QUOTA_VISIBLE_AT } from '../../config/app';
import HealthScore from '../HealthScore/HealthScore';
import BudgetSummaryBar from './BudgetSummaryBar';
import ChartWithTimeRange from './ChartWithTimeRange';
import CashFlowForecast from './CashFlowForecast';
import FirstRunGuide from './FirstRunGuide';
import BalanceTile from './BalanceTile';
import HealthTile from './HealthTile';
import GoalsTile from './GoalsTile';
import ActivityFeed from './ActivityFeed';
import KeptPerMonthTile from './KeptPerMonthTile';
import ComingUpTile from './ComingUpTile';
import PageHeader from '../UI/PageHeader';
import MonthSwitcher from '../UI/MonthSwitcher';
import Button from '../UI/Button';
import Card from '../UI/Card';
import { Plus } from 'lucide-react';
import { formatMonthName } from '../../utils/date';
import {
  addMonths, balanceSeries, budgetsKept, daysInMonth, goalsOnTrack, isSameMonth, keptSeries, monthKeyOf, monthTotals, savingRate,
} from '../../utils/finance/dashboardModel';

const Transactions = lazy(() => import('../Transactions/Transactions'));
const CategoryPieChart = lazy(() => import('../Transactions/CategoryPieChart'));
const CategoryBenchmark = lazy(() => import('../Benchmark/CategoryBenchmark'));

function getTimeGreeting(t) {
  const hour = new Date().getHours();
  if (hour < 12) return t('dashboard.goodMorning');
  if (hour < 17) return t('dashboard.goodAfternoon');
  return t('dashboard.goodEvening');
}

// Spans on the 12-column grid (>=1024px); single column below (spec 4).
const SPAN_7 = 'lg:col-span-7';
const SPAN_5 = 'lg:col-span-5';

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
    categories,
    loading,
    error,
    net,
    mutationCount,
  } = useTransactions();

  const { monthlyTransactionCount, transactionLimit } = useSubscription();

  // Month shown by the month-scoped tiles. Never in the future.
  const now = new Date();
  const [monthRef, setMonthRef] = useState(() => addMonths(new Date(), 0));
  const isCurrentMonth = isSameMonth(monthRef, now);
  const monthKey = monthKeyOf(monthRef);
  const monthLabel = `${formatMonthName(monthRef, i18n.language)} ${monthRef.getFullYear()}`;

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

  // Budgets + spend by category for the selected month: shared by the
  // Budgets tile and the Activity feed (meta line + stacked bar).
  const { data: monthData, loading: monthLoading } = useAsyncData(
    async () => {
      const y = monthRef.getFullYear();
      const m = monthRef.getMonth() + 1;
      const [budgets, expenses] = await Promise.all([fetchBudgets(y, m), fetchMonthlyExpensesByCategory(y, m)]);
      return { budgets: budgets || [], expenses: expenses || {} };
    },
    [monthKey, mutationCount],
    { budgets: [], expenses: {} },
  );

  // Health score for the selected month + history (for the month-over-month
  // delta). Fetched once, shared by the Health tile and the details card.
  const { data: health, loading: healthLoading } = useAsyncData(
    async () => {
      const [score, history] = await Promise.all([
        fetchHealthScore({ month: monthRef }),
        fetchHealthScoreHistory(6),
      ]);
      return { score, history: history || [] };
    },
    [monthKey, mutationCount],
    null,
  );
  const prevKey = `${monthKeyOf(addMonths(monthRef, -1))}-01`;
  const prevScore = health?.history?.find((h) => h.monthDate === prevKey)?.totalScore;

  // Goals: shared by the Goals tile and the "goals on track" figure.
  const { data: goals, loading: goalsLoading } = useAsyncData(() => fetchGoals(), [mutationCount], []);

  const totals = useMemo(() => monthTotals(transactions, monthRef), [transactions, monthRef]);
  // The three figures beside the health ring, for the selected month.
  const healthStats = useMemo(() => ({
    savingRate: savingRate(totals),
    budgets: budgetsKept(monthData.budgets, monthData.expenses),
    goals: goalsOnTrack(goals),
  }), [totals, monthData, goals]);
  const balance = useMemo(() => balanceSeries(transactions, monthRef, 8), [transactions, monthRef]);
  const kept = useMemo(() => keptSeries(transactions, monthRef, 6), [transactions, monthRef]);

  const handleAddTransaction = () => {
    window.dispatchEvent(new CustomEvent('openAddTransaction'));
  };

  const isNewUser = !loading && transactions.length === 0;

  return (
    <>
      {/* Welcome greeting toast */}
      {showGreeting && (
        <div
          role="status"
          className="fixed bottom-7 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-pill text-sm font-bold animate-toast-in max-w-[calc(100vw-32px)] text-center"
          style={{ backgroundColor: 'var(--toast-bg)', color: 'var(--toast-fg)' }}
        >
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
        <div className="mb-gap">
          <FreePlanUsageCounter
            used={monthlyTransactionCount}
            limit={transactionLimit}
            labelKey="freePlanCounter.transactions"
          />
        </div>
      )}

      {/* Header row (spec 3.5): h1, month switcher + day chip, Add transaction. */}
      <PageHeader
        title={username ? `${getTimeGreeting(t)}, ${username}` : t('dashboard.title')}
        subtitle={formatTodayLabel()}
        chip={isCurrentMonth ? t('dashboard.dayOfMonth', { day: now.getDate(), total: daysInMonth(now) }) : null}
        actions={(
          <Button onClick={handleAddTransaction} leading="plus" type="button" className="hidden sm:inline-flex">
            {t('dashboard.addTransaction')}
          </Button>
        )}
      >
        <MonthSwitcher
          label={monthLabel}
          onPrev={() => setMonthRef((m) => addMonths(m, -1))}
          onNext={() => setMonthRef((m) => (isSameMonth(m, now) ? m : addMonths(m, 1)))}
          prevLabel={t('dashboard.prevMonth')}
          nextLabel={t('dashboard.nextMonth')}
        />
      </PageHeader>

      {error && (
        <div role="alert" className="mb-gap tile p-gap border-2 !border-expense text-expense font-bold text-sm">
          {error}
        </div>
      )}

      {/* New accounts: the guide stays above everything (spec 4.1). */}
      {isNewUser && (
        <div className="mb-gap">
          <FirstRunGuide onAddTransaction={handleAddTransaction} index={0} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gap">
        {/* Row 1 */}
        <BalanceTile net={net} totals={totals} series={balance} monthRef={monthRef} index={0} className={SPAN_7} />
        <HealthTile
          score={health?.score}
          prevScore={prevScore}
          stats={healthStats}
          loading={healthLoading}
          index={1}
          className={SPAN_5}
        />

        {/* Row 2 */}
        <BudgetSummaryBar
          budgets={monthData.budgets}
          expenses={monthData.expenses}
          loading={monthLoading}
          monthLabel={formatMonthName(monthRef, i18n.language)}
          index={2}
          className={SPAN_7}
        />
        <GoalsTile goals={goals} loading={goalsLoading} index={3} className={SPAN_5} />

        {/* Row 3: Activity spans two rows next to Kept + Coming up */}
        <ActivityFeed
          transactions={transactions}
          categories={categories}
          monthRef={monthRef}
          budgets={monthData.budgets}
          expenses={monthData.expenses}
          loading={loading}
          index={4}
          className={`${SPAN_7} lg:row-span-2`}
        />
        <KeptPerMonthTile series={kept} totals={totals} monthRef={monthRef} index={5} className={SPAN_5} />
        <ComingUpTile reloadTrigger={mutationCount} index={6} className={SPAN_5} />
      </div>

      {/* Row 4: the rest of the dashboard, restyled as tiles, nothing removed.
          Reserved min-height keeps the async children from pushing the footer
          around (CLS). */}
      <Suspense fallback={<div className="mt-gap min-h-[600px]" />}>
        {!isNewUser && (
          <div className="mt-gap grid grid-cols-1 lg:grid-cols-12 gap-gap items-start min-h-[600px]">
            <ChartWithTimeRange transactions={transactions} index={7} className={SPAN_7} />
            <Card index={8} className={SPAN_5}>
              <div className="flex items-baseline justify-between gap-3 mb-gap">
                <h2 className="text-h3 font-bold text-fg">{t('dashboard.spendingByCategory')}</h2>
                <span className="text-sm font-semibold text-fg">{t('dashboard.allTime')}</span>
              </div>
              {/* Own Suspense boundary: mounting alongside the transaction
                  list let ResponsiveContainer measure 0x0 mid-layout and
                  never redraw. Fallback matches the chart's height. */}
              <Suspense fallback={<div className="min-h-[180px]" />}>
                <CategoryPieChart transactions={transactions} type="expense" layout="stacked" />
              </Suspense>
            </Card>
            <div className={`${SPAN_7} min-w-0`}>
              <CashFlowForecast />
            </div>
            <Card index={8} className={SPAN_5}>
              <div className="flex items-baseline justify-between gap-3 mb-gap">
                <h2 className="text-h3 font-bold text-fg">{t('dashboard.incomeBySource')}</h2>
                <span className="text-sm font-semibold text-fg">{t('dashboard.allTime')}</span>
              </div>
              <Suspense fallback={<div className="min-h-[180px]" />}>
                <CategoryPieChart transactions={transactions} type="income" />
              </Suspense>
            </Card>
          </div>
        )}

        {/* Owns the add/edit sheet, the openAdd/openEdit listeners and
            recurring processing (no list of its own). */}
        <Transactions variant="host" />

        <div className="mt-gap grid grid-cols-1 gap-gap">
          <CategoryBenchmark onReloadTrigger={mutationCount} />
          <HealthScore variant="details" data={health} onReloadTrigger={mutationCount} />
        </div>
      </Suspense>

      {/* Mobile FAB */}
      <button
        onClick={handleAddTransaction}
        type="button"
        className="group btn-motion btn-lift fixed bottom-6 right-6 z-40 lg:hidden w-14 h-14 bg-brand-600 hover:bg-brand-700 text-white rounded-pill shadow-sheet flex items-center justify-center"
        aria-label={t('dashboard.addTransaction')}
      >
        <Plus className="plus-spin w-6 h-6" strokeWidth={2.6} aria-hidden="true" />
      </button>
    </>
  );
}
