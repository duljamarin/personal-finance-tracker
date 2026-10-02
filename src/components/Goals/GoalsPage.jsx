import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import StatStrip from '../UI/StatStrip';
import SegmentedControl from '../UI/SegmentedControl';
import { Plus, Target } from 'lucide-react';
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
import FreePlanUsageCounter from '../Subscription/FreePlanUsageCounter';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

export default function GoalsPage() {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
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

      // Backstop: never create a transaction for a withdrawal that would drive
      // the goal's saved balance negative (DB enforces current_amount >= 0).
      // The form blocks this too, but guard here so we never orphan a tx.
      const savedAmount = Number(selectedGoal.current_amount) || 0;
      if (isWithdrawal && contributionData.amount > savedAmount) {
        addToast(
          t('goals.contributions.withdrawExceedsError', { amount: fmt(savedAmount) }),
          'error'
        );
        return;
      }

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
        // Currency omitted on purpose: the API stamps the user's single
        // currency, so contributions match every other amount in the app.
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
      // The goals_current_amount_check constraint surfaces as a raw Postgres
      // message — translate it to the friendly over-withdrawal warning.
      const raw = error?.message || '';
      const isBalanceConstraint =
        raw.includes('goals_current_amount_check') || error?.code === '23514';
      if (isBalanceConstraint) {
        const savedAmount = Number(selectedGoal?.current_amount) || 0;
        addToast(
          t('goals.contributions.withdrawExceedsError', { amount: fmt(savedAmount) }),
          'error'
        );
      } else {
        addToast(raw || t('goals.toast.error'), 'error');
      }
    }
  };

  if (loading) {
    return <LoadingSpinner size="md" className="min-h-[60vh]" />;
  }

  const overallPct = stats && stats.totalTarget > 0 ? Math.min(100, Math.round((stats.totalSaved / stats.totalTarget) * 100)) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        className="!mb-0"
        actions={
          <Button onClick={() => setShowGoalForm(true)} disabled={!canAdd}>
            <span className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" strokeWidth={2} />
              {t('goals.addGoal')}
            </span>
          </Button>
        }
      />

      {/* Free plan usage counter */}
      {/* Goals have no month column, unlike budgets: the cap counts goals that
          are active and not yet completed, so completing one frees a slot. The
          "Active goals" label already carries that — no scopeNote needed. */}
      <FreePlanUsageCounter
        used={activeGoalCount}
        limit={goalLimit}
        labelKey="freePlanCounter.goals"
      />

      {/* Free tier limit banner */}
      {!isPremium && !canAdd && (
        <div className="p-4 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline border-l-2 border-l-brand-600 dark:border-l-brand-400 rounded-container flex items-center justify-between gap-3">
          <p className="text-sm text-ink-muted dark:text-white">
            {t('limits.goalLimitReached', { limit: goalLimit })}
          </p>
          <Link to="/pricing" className="text-sm font-medium text-brand-600 dark:text-brand-400 hover:underline whitespace-nowrap">
            {t('upgrade.upgradeCta')}
          </Link>
        </div>
      )}

      {stats && stats.totalGoals > 0 && (
        <StatStrip
          items={[
            {
              label: t('goals.stats.totalSaved'),
              value: fmt(stats.totalSaved),
              tone: 'income',
              hero: true,
              note: t('goals.stats.ofTarget', { amount: fmt(stats.totalTarget) }),
            },
            {
              label: t('goals.stats.progress'),
              value: `${overallPct}%`,
              children: (
                <div className="mt-3 h-1.5 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-500" style={{ width: `${overallPct}%` }} />
                </div>
              ),
            },
            { label: t('goals.stats.activeGoals'), value: stats.activeGoals },
            { label: t('goals.stats.completedGoals'), value: stats.completedGoals },
          ]}
        />
      )}

      <SegmentedControl
        value={filter}
        onChange={setFilter}
        options={['all', 'active', 'completed'].map(f => ({ value: f, label: t(`goals.filters.${f}`) }))}
      />

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-5 h-5" strokeWidth={1.75} />}
          title={t('goals.noGoals')}
          description={t('goals.noGoalsDesc')}
          action={() => setShowGoalForm(true)}
          actionLabel={t('goals.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: goalLimit }) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
