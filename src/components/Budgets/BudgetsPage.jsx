import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Button from '../UI/Button';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import EmptyState from '../UI/EmptyState';
import BudgetCard from './BudgetCard';
import BudgetForm from './BudgetForm';
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, fetchMonthlyExpensesByCategory, fetchCategories } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import { useFormModal } from '../../hooks/useFormModal';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MONTH_KEYS } from '../../utils/constants';
import { progressColor } from '../../utils/chartColors';
import PageHeader from '../UI/PageHeader';
import MonthSwitcher from '../UI/MonthSwitcher';
import { Plus, Copy, PieChart } from 'lucide-react';
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
  const isFutureMonth = selectedYear > today.getFullYear() ||
    (selectedYear === today.getFullYear() && selectedMonth > today.getMonth() + 1);

  const totalBudgeted = useMemo(() =>
    budgets.reduce((sum, b) => sum + Number(b.amount), 0), [budgets]);

  const totalSpent = useMemo(() =>
    budgets.reduce((sum, b) => sum + (Number(expensesByCategory[b.category_id]) || 0), 0), [budgets, expensesByCategory]);

  const totalRemaining = totalBudgeted - totalSpent;
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

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('budgets.title')}
        subtitle={t('budgets.subtitle')}
        actions={
          <>
            <Button variant="secondary" onClick={handleCopyFromPrevious} disabled={!canCreate}>
              <span className="inline-flex items-center gap-2">
                <Copy className="w-4 h-4" strokeWidth={1.75} />
                {t('budgets.copyFromPrevious')}
              </span>
            </Button>
            <Button onClick={openBudgetForm} disabled={!canCreate}>
              <span className="inline-flex items-center gap-2">
                <Plus className="w-4 h-4" strokeWidth={2} />
                {t('budgets.addBudget')}
              </span>
            </Button>
          </>
        }
        className="!mb-0"
      >
        <div className="mt-4">
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
        <div className="p-4 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline border-l-2 border-l-brand-600 dark:border-l-brand-400 rounded-container flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted dark:text-white">
            {t('limits.budgetLimitReached', { limit: budgetLimit })}
          </p>
          <Link to="/pricing" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap">
            {t('upgrade.upgradeCta')}
          </Link>
        </div>
      )}

      {budgets.length === 0 ? (
        <EmptyState
          icon={<PieChart className="w-5 h-5" strokeWidth={1.75} />}
          title={t('budgets.noData')}
          description={t('budgets.noDataDesc')}
          action={openBudgetForm}
          actionLabel={t('budgets.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: budgetLimit }) : null}
        />
      ) : (
        <>
          {/* Month overview: one hero figure (what's left), one bar for the
              whole month, then the supporting numbers. */}
          <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow">{totalRemaining >= 0 ? t('budgets.leftToSpend') : t('budgets.overBudgetTotal')}</p>
                <p className={`mt-2 [overflow-wrap:anywhere] text-4xl sm:text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none ${totalRemaining < 0 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
                  {fmt(Math.abs(totalRemaining))}
                </p>
                <p className="mt-3 text-sm text-ink-muted dark:text-white tabular-nums">
                  {t('budgets.ofBudgeted', { spent: fmt(totalSpent), budgeted: fmt(totalBudgeted) })}
                </p>
              </div>
              {daysLeft !== null && (
                <div className="sm:text-right">
                  <p className="text-sm font-medium text-ink-primary dark:text-white tabular-nums">
                    {t('budgets.daysLeft', { count: daysLeft })}
                  </p>
                  {perDay !== null && (
                    <p className="mt-1 text-sm text-ink-muted dark:text-white tabular-nums">
                      {t('budgets.perDay', { amount: fmt(perDay) })}
                    </p>
                  )}
                </div>
              )}
            </div>
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-2 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(100, overallRatio * 100)}%`, backgroundColor: progressColor(overallRatio) }}
                />
              </div>
              <span className={`text-sm font-semibold tabular-nums ${percentUsed > 100 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
                {percentUsed}%
              </span>
            </div>
          </section>

          {/* Category budgets as one list, not a wall of cards */}
          <section className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline overflow-hidden">
            <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-surface-hairline dark:border-surface-dark-hairline">
              <h2 className="text-heading text-ink-primary dark:text-white">{t('budgets.categoriesHeading')}</h2>
              <span className="text-xs text-ink-muted dark:text-white tabular-nums">{budgets.length}</span>
            </div>
            <div className="divide-y divide-surface-hairline dark:divide-surface-dark-hairline">
              {budgets.map(budget => (
                <BudgetCard
                  key={budget.id}
                  budget={budget}
                  spent={expensesByCategory[budget.category_id] || 0}
                  isCurrentMonth={isCurrentMonth}
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
