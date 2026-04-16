import { useState, useEffect, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import EmptyState from '../UI/EmptyState';
import BudgetCard from './BudgetCard';
import BudgetForm from './BudgetForm';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, fetchMonthlyExpensesByCategory, fetchCategories } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import { useFormModal } from '../../hooks/useFormModal';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MONTH_KEYS } from '../../utils/constants';
import { getValueColorClass } from '../../utils/classNames';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function BudgetsPage() {
  const { t } = useTranslation();
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

  // Re-fetch only expenses (cheap) - called by realtime subscription
  const refreshExpenses = useCallback(async () => {
    try {
      const fresh = await fetchMonthlyExpensesByCategory(selectedYear, selectedMonth);
      setExpensesByCategory(fresh);
    } catch (e) {
      console.error('Error refreshing expenses:', e);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    loadData();
  }, [selectedYear, selectedMonth]);

  // Realtime: refresh spent amounts instantly when transactions change
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`budgets-live-${user.id}-${selectedYear}-${selectedMonth}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transactions',
        filter: `user_id=eq.${user.id}`
      }, refreshExpenses)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'transaction_splits',
        filter: `user_id=eq.${user.id}`
      }, refreshExpenses)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [user, selectedYear, selectedMonth, refreshExpenses]);

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
    try {
      await deleteBudget(budgetToDelete.id);
      addToast(t('budgets.toast.deleted'), 'success');
      setBudgetToDelete(null);
      loadData();
      reloadTransactions();
    } catch (error) {
      console.error('Error deleting budget:', error);
      addToast(t('budgets.toast.error'), 'error');
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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('budgets.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('budgets.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyFromPrevious}
            disabled={!canCreateBudget(budgets.length)}
            className={`px-4 py-2 text-sm font-medium border rounded-lg transition ${
              canCreateBudget(budgets.length)
                ? 'text-brand-700 dark:text-brand-300 bg-brand-50 dark:bg-brand-900/20 hover:bg-brand-100 dark:hover:bg-brand-900/30 border-brand-200 dark:border-brand-800'
                : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-surface-dark-tertiary border-gray-200 dark:border-zinc-700 cursor-not-allowed'
            }`}
          >
            {t('budgets.copyFromPrevious')}
          </button>
          <Button
            onClick={openBudgetForm}
            disabled={!canCreateBudget(budgets.length)}
          >
            + {t('budgets.addBudget')}
          </Button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4 bg-white dark:bg-surface-dark-tertiary rounded-xl shadow-sm border border-gray-100 dark:border-zinc-800 p-3">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-lg font-semibold text-gray-800 dark:text-white min-w-[160px] text-center">
          {t(`chart.months.${MONTH_KEYS[selectedMonth - 1]}`)} {selectedYear}
        </span>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 text-gray-600 dark:text-gray-300 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {isCurrentMonth && (
          <span className="ml-2 text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 rounded-full">
            {t('budgets.currentMonth')}
          </span>
        )}
      </div>

      {/* Free tier limit banner */}
      {!isPremium && budgets.length >= budgetLimit && (
        <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center justify-between gap-3">
          <p className="text-sm text-brand-800 dark:text-brand-200">
            {t('limits.budgetLimitReached', { limit: budgetLimit })}
          </p>
          <Link to="/pricing" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap">
            {t('upgrade.upgradeCta')}
          </Link>
        </div>
      )}

      {/* Summary Stats */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.stats.totalBudgeted')}</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                €{totalBudgeted.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.stats.totalSpent')}</p>
              <p className={`text-2xl font-bold ${getValueColorClass(totalSpent, totalBudgeted, {
                positive: 'text-red-600 dark:text-red-400',
                negative: 'text-gray-800 dark:text-white'
              })}`}>
                €{totalSpent.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.stats.totalRemaining')}</p>
              <p className={`text-2xl font-bold ${getValueColorClass(totalRemaining, 0, {
                positive: 'text-brand-600 dark:text-brand-400',
                negative: 'text-red-600 dark:text-red-400'
              })}`}>
                €{totalRemaining.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.stats.percentUsed')}</p>
              <p className={`text-2xl font-bold ${percentUsed > 100 ? 'text-red-600 dark:text-red-400' : percentUsed > 80 ? 'text-orange-600 dark:text-orange-400' : 'text-blue-600 dark:text-blue-400'}`}>
                {percentUsed}%
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Budget Cards Grid or Empty State */}
      {budgets.length === 0 ? (
        <EmptyState
          icon={<svg className="w-10 h-10 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
          title={t('budgets.noData')}
          description={t('budgets.noDataDesc')}
          action={openBudgetForm}
          actionLabel={t('budgets.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: budgetLimit }) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        />
      )}
    </div>
  );
}
