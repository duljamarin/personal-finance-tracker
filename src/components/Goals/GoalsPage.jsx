import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import GoalCard from './GoalCard';
import GoalForm from './GoalForm';
import ContributionForm from './ContributionForm';
import { fetchGoals, fetchGoalsStats, createGoal, updateGoal, deleteGoal, addContribution, addTransaction } from '../../utils/api';
import { useToast } from '../../context/ToastContext';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [goals, setGoals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');
  
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);
  const [showContributionForm, setShowContributionForm] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

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
      addToast(error.message || t('goals.toast.error'), 'error');
    }
  };

  const handleDeleteGoal = async (goal) => {
    if (!window.confirm(t('goals.delete.message'))) return;
    
    try {
      await deleteGoal(goal.id);
      addToast(t('goals.toast.deleted'), 'success');
      loadData();
    } catch (error) {
      console.error('Error deleting goal:', error);
      addToast(t('goals.toast.error'), 'error');
    }
  };

  const handleAddContribution = async (contributionData) => {
    try {
      const isWithdrawal = contributionData.amount < 0;
      
      // Krijo transaksionin së pari
      const transaction = await addTransaction({
        title: `${isWithdrawal ? t('goals.contributions.withdraw') : t('goals.contributions.title')} - ${selectedGoal.name}`,
        amount: Math.abs(contributionData.amount),
        date: contributionData.date,
        type: isWithdrawal ? 'income' : 'expense',
        categoryId: null, // Objektivat nuk kanë kategori - përdor tags
        tags: ['goal', 'objektiv'],
        currencyCode: 'EUR',
        exchangeRate: 1.0
      });

      // Pastaj krijo kontributin me transaction_id
      await addContribution(selectedGoal.id, {
        ...contributionData,
        transactionId: transaction.id
      });

      addToast(t('goals.toast.contributionAdded'), 'success');
      setShowContributionForm(false);
      setSelectedGoal(null);
      await loadData();
      
      // Signal that transactions need refresh
      localStorage.setItem('transactions_needs_refresh', 'true');
    } catch (error) {
      console.error('Error adding contribution:', error);
      addToast(error.message || t('goals.toast.error'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            {t('goals.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">{t('goals.subtitle')}</p>
        </div>
        <Button onClick={() => setShowGoalForm(true)}>
          + {t('goals.addGoal')}
        </Button>
      </div>

      {/* Stats */}
      {stats && stats.totalGoals > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">{t('goals.stats.totalSaved')}</p>
              <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
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
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
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
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t(`goals.filters.${f}`)}
          </button>
        ))}
      </div>

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <Card>
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-indigo-200 dark:from-indigo-900 dark:to-indigo-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
              {t('goals.noGoals')}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm mx-auto">
              {t('goals.noGoalsDesc')}
            </p>
            <Button onClick={() => setShowGoalForm(true)}>
              {t('goals.createFirst')}
            </Button>
          </div>
        </Card>
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
    </div>
  );
}
