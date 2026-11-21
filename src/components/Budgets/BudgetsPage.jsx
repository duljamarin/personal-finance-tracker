import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import EmptyState from '../UI/EmptyState';
import BudgetCard from './BudgetCard';
import BudgetForm from './BudgetForm';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, fetchMonthlyExpensesByCategory, fetchCategories } from '../../utils/api';
import { useMonthForecast } from '../../hooks/useMonthForecast';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import { useFormModal } from '../../hooks/useFormModal';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MONTH_KEYS } from '../../utils/constants';
import PageHeader from '../UI/PageHeader';
import MonthSwitcher from '../UI/MonthSwitcher';
import { Copy, PieChart, ArrowRight } from 'lucide-react';
import Card from '../UI/Card';
import { useCountUp } from '../../hooks/useCountUp';
import { MINUS } from '../../utils/bento';
import { dataDelay, delayStyle } from '../../utils/motion';
import { Link } from 'react-router-dom';

export default function BudgetsPage() {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { isPremium, canCreateBudget, budgetLimit } = useSubscription();
  const { reloadTransactions } = useTransactions();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-based

  const [budgets, setBudgets] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen: showBudgetForm, editingItem: editingBudget, openAdd: openBudgetForm, openEdit: openBudgetEdit, close: closeBudgetForm } = useFormModal();
  const [budgetToDelete, setBudgetToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Derived values
  const isCurrentMonth = selectedYear === today.getFullYear() && selectedMonth === today.getMonth() + 1;
  // Month-end projections come from the forecast engine (current month only).
  // `budgets` is the reload signal: it is a new array after every save.
  const { forecast: monthForecast } = useMonthForecast({ reloadKey: budgets });
  const projectionByCategory = useMemo(
    () => new Map((monthForecast?.CATEGORIES || []).map((c) => [c.categoryId, c])),
    [monthForecast],
  );
  const isFutureMonth = selectedYear > today.getFullYear() ||
    (selectedYear === today.getFullYear() && selectedMonth > today.getMonth() + 1);

  const totalBudgeted = useMemo(() =>
    budgets.reduce((sum, b) => sum + Number(b.amount), 0), [budgets]);

  const totalSpent = useMemo(() =>
    budgets.reduce((sum, b) => sum + (Number(expensesByCategory[b.category_id]) || 0), 0), [budgets, expensesByCategory]);

  const totalRemaining = totalBudgeted - totalSpent;
  const remainingShown = useCountUp(totalRemaining, { delay: dataDelay(0) });
  const percentUsed = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0;

  // Categories that don't already have a budget for the selected month
  const availableCategories = useMemo(() => {
    const budgetedCategoryIds = new Set(budgets.map(b => b.category_id));
    return categories.filter(c => !budgetedCategoryIds.has(c.id));
  }, [categories, budgets]);

  // Load all data for the selected month
  const loadData = async () => {
    setLoading(true);
    try {
      const [budgetsData, expensesData, categoriesData] = await Promise.all([
        fetchBudgets(selectedYear, selectedMonth),
        fetchMonthlyExpensesByCategory(selectedYear, selectedMonth),
        fetchCategories()
      ]);
      setBudgets(budgetsData);
      setExpensesByCategory(expensesData);
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error loading budgets:', error);
      addToast(t('budgets.loadError'), 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Month navigator
  const goToPrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedMonth(12);
      setSelectedYear(y => y - 1);
    } else {
      setSelectedMonth(m => m - 1);
    }
  };

  const goToNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedMonth(1);
      setSelectedYear(y => y + 1);
    } else {
      setSelectedMonth(m => m + 1);
    }
  };

  // CRUD handlers
  const handleSaveBudget = async (data) => {
    try {
      if (editingBudget) {
        await updateBudget(editingBudget.id, data);
        addToast(t('budgets.toast.updated'), 'success');
      } else {
        await createBudget({ ...data, year: selectedYear, month: selectedMonth });
        addToast(t('budgets.toast.created'), 'success');
      }
      closeBudgetForm();
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      if (error.message?.includes('limit reached')) {
        addToast(t('limits.budgetLimitReached', { limit: budgetLimit }), 'warning');
      } else {
        addToast(error.message || t('budgets.toast.error'), 'error');
      }
    }
  };

  const handleDeleteBudget = (budget) => {
    setBudgetToDelete(budget);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteBudget(budgetToDelete.id);
      addToast(t('budgets.toast.deleted'), 'success');
      setBudgetToDelete(null);
      loadData();
      reloadTransactions();
    } catch (error) {
      console.error('Error deleting budget:', error);
      addToast(t('budgets.toast.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  // Copy budgets from the previous month
  const handleCopyFromPrevious = async () => {
    const prevMonth = selectedMonth === 1 ? 12 : selectedMonth - 1;
    const prevYear = selectedMonth === 1 ? selectedYear - 1 : selectedYear;

    try {
      const prevBudgets = await fetchBudgets(prevYear, prevMonth);

      if (prevBudgets.length === 0) {
        addToast(t('budgets.toast.copyEmpty'), 'info');
        return;
      }

      const existingCategoryIds = new Set(budgets.map(b => b.category_id));
      let copied = 0;
      const maxToCreate = isPremium ? Infinity : budgetLimit - budgets.length;

      for (const prev of prevBudgets) {
        if (existingCategoryIds.has(prev.category_id)) continue;
        if (copied >= maxToCreate) break;
        try {
          await createBudget({
            categoryId: prev.category_id,
            year: selectedYear,
            month: selectedMonth,
            amount: Number(prev.amount)
          });
          copied++;
        } catch {
          // Skip silently - category may have been deleted or constraint hit
        }
      }

      addToast(t('budgets.toast.copied'), 'success');
      loadData();
    } catch (error) {
      console.error('Error copying budgets:', error);
      addToast(t('budgets.toast.error'), 'error');
    }
  };

  // Loading state
  if (loading) {
    return <LoadingSpinner size="md" className="min-h-[60vh]" />;
  }

  // Days left + daily allowance only make sense while the month is running.
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const daysLeft = isCurrentMonth ? daysInMonth - today.getDate() + 1 : null;
  const perDay = isCurrentMonth && totalRemaining > 0 ? totalRemaining / daysLeft : null;
  const monthLabel = `${t(`chart.months.${MONTH_KEYS[selectedMonth - 1]}`)} ${selectedYear}`;
  const overallRatio = totalBudgeted > 0 ? totalSpent / totalBudgeted : 0;
  const canCreate = canCreateBudget(budgets.length);
  // Month-end projection of the budgeted categories, from the forecast engine
  // (same numbers as each budget's forecast line), only while the month runs.
  const projectedTotal = isCurrentMonth && monthForecast ? monthForecast.BUDGETED_PROJECTED_EXPENSE : null;

  return (
    <div className="space-y-gap">
      <PageHeader
        title={t('budgets.title')}
        subtitle={t('budgets.subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={handleCopyFromPrevious} disabled={!canCreate} type="button">
              <Copy className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
              {t('budgets.copyFromPrevious')}
            </Button>
            <Button onClick={openBudgetForm} disabled={!canCreate} leading="plus" type="button">
              {t('budgets.addBudget')}
            </Button>
          </>
        }
        className="!mb-0"
      >
        <div>
          <MonthSwitcher
            label={monthLabel}
            onPrev={goToPrevMonth}
            onNext={goToNextMonth}
            prevLabel={t('budgets.prevMonth')}
            nextLabel={t('budgets.nextMonth')}
            badge={isCurrentMonth ? t('budgets.currentMonth') : null}
          />
        </div>
      </PageHeader>

      {/* Free plan usage counter */}
      {/* Budgets are stored per year+month, so the cap applies to the month the
          user is currently looking at, not to their account overall. Name that
          month explicitly — "8 / 10" alone reads as a global cap. */}
      <FreePlanUsageCounter
        used={budgets.length}
        limit={budgetLimit}
        labelKey="freePlanCounter.budgets"
        scopeNote={t('freePlanCounter.scopeMonth', {
          month: t(`chart.months.${MONTH_KEYS[selectedMonth - 1]}`),
        })}
      />

      {/* Free tier limit banner */}
      {!isPremium && budgets.length >= budgetLimit && (
        <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-fg">
            {t('limits.budgetLimitReached', { limit: budgetLimit })}
          </p>
          <Link to="/pricing" className="group btn-motion btn-lift inline-flex items-center gap-2 min-h-11 px-5 rounded-pill bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold whitespace-nowrap">
            {t('upgrade.upgradeCta')}
            <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </Card>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon={<PieChart className="w-[22px] h-[22px]" strokeWidth={2} />}
          actionIcon="plus"
          title={t('budgets.noData')}
          description={t('budgets.noDataDesc')}
          action={openBudgetForm}
          actionLabel={t('budgets.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: budgetLimit }) : null}
        />
      ) : (
        <>
          {/* Month overview (spec 4.3): the one hero tile. What's left as the
              kpi, spent of budgeted, days left, daily allowance and the
              month-end projection at the current pace. */}
          <Card variant="hero" index={0} className="flex flex-col gap-gap">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-bold">{totalRemaining >= 0 ? t('budgets.leftToSpend') : t('budgets.overBudgetTotal')}</p>
                <p className="mt-1 [overflow-wrap:anywhere] text-kpi font-extrabold tabular-nums">
                  {totalRemaining < 0 ? MINUS : ''}{fmt(Math.abs(remainingShown))}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums">
                  {t('budgets.ofBudgeted', { spent: fmt(totalSpent), budgeted: fmt(totalBudgeted) })}
                </p>
              </div>
              {daysLeft !== null && (
                <div className="flex flex-wrap gap-2.5">
                  <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset">
                    <p className="text-sm font-semibold">{t('budgets.daysLeft', { count: daysLeft })}</p>
                    {perDay !== null && (
                      <p className="text-h3 font-extrabold tabular-nums">{t('budgets.perDay', { amount: fmt(perDay) })}</p>
                    )}
                  </div>
                  {projectedTotal !== null && (
                    <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset max-w-[260px]">
                      <p className="text-sm font-semibold">{t('budgets.onPaceLabel')}</p>
                      <p className="text-h3 font-extrabold tabular-nums">{fmt(projectedTotal)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              {/* On the green tile the bar is white on a lighter inset; the
                  over-budget state is carried by the label and the %. */}
              <div className="flex-1 h-3.5 rounded-pill bg-hero-inset overflow-hidden">
                <div
                  className="h-full rounded-pill origin-left animate-grow-x bar-w bg-white"
                  style={{ width: `${Math.min(100, overallRatio * 100)}%`, ...delayStyle(dataDelay(0)) }}
                />
              </div>
              <span className="text-h3 font-extrabold tabular-nums">{percentUsed}%</span>
            </div>
          </Card>

          {/* One tile per category budget */}
          <section aria-labelledby="budget-categories" className="flex flex-col gap-gap">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="budget-categories" className="text-h3 font-bold text-fg">{t('budgets.categoriesHeading')}</h2>
              <span className="inline-flex items-center px-3 py-1 rounded-pill bg-tile border border-line text-sm font-bold text-fg tabular-nums">{budgets.length}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gap">
              {budgets.map((budget, i) => (
                <BudgetCard
                  key={budget.id}
                  index={i + 1}
                  budget={budget}
                  spent={expensesByCategory[budget.category_id] || 0}
                  projection={isCurrentMonth ? projectionByCategory.get(budget.category_id) || null : null}
                  isFutureMonth={isFutureMonth}
                  onEdit={openBudgetEdit}
                  onDelete={handleDeleteBudget}
                />
              ))}
            </div>
          </section>
        </>
      )}

      {/* Add / Edit Modal */}
      {showBudgetForm && (
        <BudgetForm
          budget={editingBudget}
          availableCategories={availableCategories}
          onSave={handleSaveBudget}
          onClose={closeBudgetForm}
        />
      )}

      {/* Delete Confirmation Modal */}
      {budgetToDelete && (
        <ConfirmDeleteModal
          title={t('budgets.delete.title')}
          message={t('budgets.deleteConfirm')}
          onConfirm={confirmDelete}
          onCancel={() => setBudgetToDelete(null)}
          confirmLabel={t('budgets.delete.confirm')}
          cancelLabel={t('budgets.delete.cancel')}
          deleting={deleting}
        />
      )}
    </div>
  );
}
