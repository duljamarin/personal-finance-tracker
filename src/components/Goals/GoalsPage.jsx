import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import ConfirmDeleteModal from '../UI/ConfirmDeleteModal';
import EmptyState from '../UI/EmptyState';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import ContributionForm from './ContributionForm';
import { fetchGoals, fetchGoalsStats, createGoal, updateGoal, deleteGoal, addContribution, addTransaction } from '../../utils/api';
import { Link } from 'react-router-dom';
import { useToast } from '../../context/ToastContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import LoadingSpinner from '../UI/LoadingSpinner';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { isPremium, canCreateGoal, goalLimit, refreshSubscription } = useSubscription();
  const { reloadTransactions } = useTransactions();
  
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);
  const [goalToDelete, setGoalToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const activeGoalCount = stats?.activeGoals ?? 0;
  const canAdd = canCreateGoal(activeGoalCount);

  useEffect(() => {
    loadGoalsAndStats();
  }, [filter]);

  const loadGoalsAndStats = async () => {
    try {
      setLoading(true);
      const filterConfig = filter === 'active' 
        ? { isActive: true, isCompleted: false }
        : filter === 'completed'
        ? { isCompleted: true }
        : {};

      const [goalsData, statsData] = await Promise.all([
        fetchGoals(filterConfig),
        fetchGoalsStats()
      ]);
      setGoals(goalsData);
      setStats(statsData);
    } catch (error) {
      console.error('Error loading goals:', error);
      addToast(t('goals.toast.error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadData = loadGoalsAndStats;

  const handleSaveGoal = async (goalData) => {
    try {
      if (editingGoal) {
        await updateGoal(editingGoal.id, goalData);
        addToast(t('goals.toast.updated'), 'success');
      } else {
        await createGoal(goalData);
        addToast(t('goals.toast.created'), 'success');
      }
      setShowGoalForm(false);
      setEditingGoal(null);
      loadData();
    } catch (error) {
      console.error('Error saving goal:', error);
      if (error.message?.includes('limit reached')) {
        addToast(t('limits.goalLimitReached', { limit: goalLimit }), 'warning');
      } else {
        addToast(error.message || t('goals.toast.error'), 'error');
      }
    }
  };

  const handleDeleteGoal = (goal) => {
    setGoalToDelete(goal);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;
    setDeleting(true);
    try {
      await deleteGoal(goalToDelete.id);
      addToast(t('goals.toast.deleted'), 'success');
      setGoalToDelete(null);
      loadData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      addToast(t('goals.toast.error'), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddContribution = async (contributionData) => {
    try {
      const isWithdrawal = contributionData.action === 'withdraw';
      const isExpenseGoal = ['debt_payoff', 'purchase'].includes(selectedGoal.goal_type);

      // Determine transaction type based on goal type and action
      // debt_payoff/purchase: contribution = expense, withdrawal = income
      // savings/investment: contribution = income, withdrawal = expense
      let txType;
      if (isWithdrawal) {
        txType = isExpenseGoal ? 'income' : 'expense';
      } else {
        txType = isExpenseGoal ? 'expense' : 'income';
      }

      const transaction = await addTransaction({
        title: `${isWithdrawal ? t('goals.contributions.withdraw') : t('goals.contributions.title')} - ${selectedGoal.name}`,
        amount: contributionData.amount,
        date: contributionData.date,
        type: txType,
        categoryId: null, // Objektivat nuk kanë kategori - përdor tags
        tags: [t('goals.tag', 'goal')],
        currencyCode: 'EUR',
        exchangeRate: 1.0
      });

      await addContribution(selectedGoal.id, {
        amount: isWithdrawal ? -contributionData.amount : contributionData.amount,
        date: contributionData.date,
        note: contributionData.note,
        transactionId: transaction.id,
      });

      addToast(t('goals.toast.contributionAdded'), 'success');
      setShowContributionForm(false);
      setSelectedGoal(null);
      await Promise.all([loadData(), reloadTransactions()]);
      refreshSubscription();
    } catch (error) {
      console.error('Error adding contribution:', error);
      addToast(error.message || t('goals.toast.error'), 'error');
    }
  };

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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {t('goals.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('goals.subtitle')}</p>
        </div>
        <Button onClick={() => setShowGoalForm(true)} disabled={!canAdd}>
          + {t('goals.addGoal')}
        </Button>
      </div>

      {/* Free tier limit banner */}
      {!isPremium && !canAdd && (
        <div className="p-4 bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800 rounded-xl flex items-center justify-between gap-3">
          <p className="text-sm text-brand-800 dark:text-brand-200">
            {t('limits.goalLimitReached', { limit: goalLimit })}
          </p>
          <Link to="/pricing" className="text-sm font-semibold text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap">
            {t('upgrade.upgradeCta')}
          </Link>
        </div>
      )}

      {/* Stats */}
      {stats && stats.totalGoals > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('goals.stats.totalSaved')}</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                €{stats.totalSaved.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('goals.stats.totalTarget')}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">
                €{stats.totalTarget.toFixed(2)}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('goals.stats.activeGoals')}</p>
              <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.activeGoals}
              </p>
            </div>
          </Card>
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('goals.stats.completedGoals')}</p>
              <p className="text-2xl font-bold text-brand-600 dark:text-brand-400">
                {stats.completedGoals}
              </p>
            </div>
          </Card>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'active', 'completed'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              filter === f
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            {t(`goals.filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<svg className="w-10 h-10 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
          title={t('goals.noGoals')}
          description={t('goals.noGoalsDesc')}
          action={() => setShowGoalForm(true)}
          actionLabel={t('goals.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: goalLimit }) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {goals.map(goal => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={(g) => {
                setEditingGoal(g);
                setShowGoalForm(true);
              }}
              onAddContribution={(g) => {
                setSelectedGoal(g);
                setShowContributionForm(true);
              }}
              onDelete={handleDeleteGoal}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showGoalForm && (
        <GoalForm
          goal={editingGoal}
          onSave={handleSaveGoal}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
        />
      )}

      {showContributionForm && selectedGoal && (
        <ContributionForm
          goal={selectedGoal}
          onSave={handleAddContribution}
          onClose={() => {
            setShowContributionForm(false);
            setSelectedGoal(null);
          }}
        />
      )}

      {goalToDelete && (
        <ConfirmDeleteModal
          title={t('goals.delete.title')}
          message={t('goals.delete.message')}
          itemName={goalToDelete.name}
          onConfirm={confirmDeleteGoal}
          onCancel={() => setGoalToDelete(null)}
          confirmLabel={t('goals.delete.confirm')}
          cancelLabel={t('goals.delete.cancel')}
          deleting={deleting}
        />
      )}
    </div>
  );
}
