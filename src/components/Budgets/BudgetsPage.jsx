import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import Modal from '../UI/Modal';
import BudgetCard from './BudgetCard';
import BudgetForm from './BudgetForm';
import { fetchBudgets, createBudget, updateBudget, deleteBudget, fetchMonthlyExpensesByCategory, fetchCategories } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MONTH_KEYS } from '../../utils/constants';
import { getValueColorClass } from '../../utils/classNames';

export default function BudgetsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const today = new Date();
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth() + 1); // 1-based

  const [budgets, setBudgets] = useState([]);
  const [expensesByCategory, setExpensesByCategory] = useState({});
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showBudgetForm, setShowBudgetForm] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
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
      setShowBudgetForm(false);
      setEditingBudget(null);
      loadData();
    } catch (error) {
      console.error('Error saving budget:', error);
      addToast(error.message || t('budgets.toast.error'), 'error');
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

      for (const prev of prevBudgets) {
        if (existingCategoryIds.has(prev.category_id)) continue;
        try {
          await createBudget({
            categoryId: prev.category_id,
            year: selectedYear,
            month: selectedMonth,
            amount: Number(prev.amount)
          });
          copied++;
        } catch {
          // Skip silently — category may have been deleted or constraint hit
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
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            {t('budgets.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('budgets.subtitle')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleCopyFromPrevious}
            className="px-4 py-2 text-sm font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded-lg transition"
          >
            {t('budgets.copyFromPrevious')}
          </button>
          <Button onClick={() => setShowBudgetForm(true)}>
            + {t('budgets.addBudget')}
          </Button>
        </div>
      </div>

      {/* Month Navigator */}
      <div className="flex items-center justify-center gap-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-3">
        <button
          onClick={goToPrevMonth}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
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
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
        {isCurrentMonth && (
          <span className="ml-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
            {t('budgets.currentMonth')}
          </span>
        )}
      </div>

      {/* Summary Stats */}
      {budgets.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('budgets.stats.totalBudgeted')}</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
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
                positive: 'text-green-600 dark:text-green-400',
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
        <Card>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {t('budgets.noData')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {t('budgets.noDataDesc')}
            </p>
            <Button onClick={() => setShowBudgetForm(true)}>
              {t('budgets.createFirst')}
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgets.map(budget => (
            <BudgetCard
              key={budget.id}
              budget={budget}
              spent={expensesByCategory[budget.category_id] || 0}
              isCurrentMonth={isCurrentMonth}
              isFutureMonth={isFutureMonth}
              onEdit={(b) => {
                setEditingBudget(b);
                setShowBudgetForm(true);
              }}
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
          onClose={() => {
            setShowBudgetForm(false);
            setEditingBudget(null);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {budgetToDelete && (
        <Modal onClose={() => setBudgetToDelete(null)}>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
            {t('budgets.delete.title')}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {t('budgets.deleteConfirm')}
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setBudgetToDelete(null)}>
              {t('budgets.delete.cancel')}
            </Button>
            <Button variant="danger" onClick={confirmDelete}>
              {t('budgets.delete.confirm')}
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
