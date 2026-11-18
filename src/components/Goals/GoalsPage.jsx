import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '../UI/PageHeader';
import Card from '../UI/Card';
import { useCountUp } from '../../hooks/useCountUp';
import { dataDelay, delayStyle } from '../../utils/motion';
import SegmentedControl from '../UI/SegmentedControl';
import { Target, ArrowRight } from 'lucide-react';
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
  const savedShown = useCountUp(stats?.totalSaved ?? 0, { delay: dataDelay(0) });
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
    <div className="space-y-gap">
      <PageHeader
        title={t('goals.title')}
        subtitle={t('goals.subtitle')}
        className="!mb-0"
        actions={
          <Button onClick={() => setShowGoalForm(true)} disabled={!canAdd} leading="plus" type="button">
            {t('goals.addGoal')}
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
        <Card padding="sm" className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-base font-semibold text-fg">
            {t('limits.goalLimitReached', { limit: goalLimit })}
          </p>
          <Link to="/pricing" className="group btn-motion btn-lift inline-flex items-center gap-2 min-h-11 px-5 rounded-pill bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold whitespace-nowrap">
            {t('upgrade.upgradeCta')}
            <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>
        </Card>
      )}

      {/* Summary (spec V3: the page's one hero tile). Same figures as before:
          total saved of total target, overall progress, active / completed. */}
      {stats && stats.totalGoals > 0 && (
        <Card variant="hero" index={0} className="flex flex-col gap-gap">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div className="min-w-0">
              <p className="text-sm font-bold">{t('goals.stats.totalSaved')}</p>
              <p className="mt-1 text-kpi font-extrabold tabular-nums [overflow-wrap:anywhere]">{fmt(savedShown)}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums">{t('goals.stats.ofTarget', { amount: fmt(stats.totalTarget) })}</p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset">
                <p className="text-sm font-semibold">{t('goals.stats.activeGoals')}</p>
                <p className="text-h3 font-extrabold tabular-nums">{stats.activeGoals}</p>
              </div>
              <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset">
                <p className="text-sm font-semibold">{t('goals.stats.completedGoals')}</p>
                <p className="text-h3 font-extrabold tabular-nums">{stats.completedGoals}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="sr-only">{t('goals.stats.progress')}</span>
            <div className="flex-1 h-3.5 rounded-pill bg-hero-inset overflow-hidden" aria-hidden="true">
              <div className="h-full rounded-pill bg-white origin-left animate-grow-x bar-w" style={{ width: `${overallPct}%`, ...delayStyle(dataDelay(0)) }} />
            </div>
            <span className="text-h3 font-extrabold tabular-nums">{overallPct}%</span>
          </div>
        </Card>
      )}

      <SegmentedControl
        track="tile"
        ariaLabel={t('goals.title')}
        value={filter}
        onChange={setFilter}
        options={['all', 'active', 'completed'].map(f => ({ value: f, label: t(`goals.filters.${f}`) }))}
      />

      {/* Goals Grid */}
      {goals.length === 0 ? (
        <EmptyState
          icon={<Target className="w-[22px] h-[22px]" strokeWidth={2} />}
          actionIcon="plus"
          title={t('goals.noGoals')}
          description={t('goals.noGoalsDesc')}
          action={() => setShowGoalForm(true)}
          actionLabel={t('goals.createFirst')}
          limitText={!isPremium ? t('limits.freeLimit', { limit: goalLimit }) : null}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-gap">
          {goals.map((goal, i) => (
            <GoalCard
              key={goal.id}
              index={i + 1}
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
