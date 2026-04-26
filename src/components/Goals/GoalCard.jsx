import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Icon from '../UI/Icon';

export default memo(function GoalCard({ goal, onEdit, onAddContribution, onDelete }) {
  const { t } = useTranslation();

  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Number(goal.current_amount) || 0;

  // Calculate progress correctly
  const progress = targetAmount > 0
    ? Math.round((currentAmount / targetAmount) * 100)
    : 0;

  // Cap at 100% for display
  const displayProgress = Math.min(progress, 100);

  const remaining = Math.max(0, targetAmount - currentAmount);

  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24))
    : null;

  const getStatusColor = () => {
    if (goal.is_completed) return 'text-brand-600 dark:text-brand-500';
    if (!daysLeft) return 'text-ink-muted dark:text-ink-dark-muted';
    if (daysLeft < 0) return 'text-[#e05c6b] dark:text-[#f08090]';
    if (daysLeft < 30) return 'text-brand-700 dark:text-brand-500';
    return 'text-ink-secondary dark:text-ink-dark-secondary';
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: goal.color }}
              />
              <h3 className="font-display font-semibold tracking-tight text-lg text-ink-primary dark:text-ink-dark-primary">
                {goal.name}
              </h3>
            </div>
            {goal.description && (
              <p className="text-sm text-ink-muted dark:text-ink-dark-muted line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="p-2 text-ink-muted dark:text-ink-dark-muted hover:text-brand-600 dark:hover:text-brand-500 transition"
              title={t('goals.editGoal')}
            >
              <Icon name="edit" />
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="p-2 text-ink-muted dark:text-ink-dark-muted hover:text-[#e05c6b] dark:hover:text-[#f08090] transition"
              title={t('goals.deleteGoal')}
            >
              <Icon name="delete" />
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-display text-ink-secondary dark:text-ink-dark-secondary">
                €{currentAmount.toFixed(2)} {t('goals.card.saved')}
              </span>
              <span className="font-semibold text-ink-secondary dark:text-ink-dark-secondary">
                {displayProgress}%
              </span>
            </div>
            <div className="w-full bg-surface-hairline dark:bg-surface-dark-hairline rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full transition-all duration-300"
                style={{ width: `${displayProgress}%`, backgroundColor: '#168b78' }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-ink-muted dark:text-ink-dark-muted font-display">
              <span>€0</span>
              <span>€{targetAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-ink-secondary dark:text-ink-dark-secondary">
              {remaining > 0 ? (
                <><span className="font-display">€{remaining.toFixed(2)}</span> {t('goals.card.remaining')}</>
              ) : (
                <span className="text-brand-600 dark:text-brand-500 font-semibold">
                  {t('goals.status.completed')}
                </span>
              )}
            </span>
            {daysLeft !== null && (
              <span className={`font-medium ${getStatusColor()}`}>
                {daysLeft >= 0 ? (
                  <>{daysLeft} {t('goals.card.daysLeft')}</>
                ) : (
                  t('goals.card.overdue')
                )}
              </span>
            )}
            {daysLeft === null && (
              <span className="text-ink-muted dark:text-ink-dark-muted">
                {t('goals.card.noDeadline')}
              </span>
            )}
          </div>

          <button
            onClick={() => onAddContribution(goal)}
            className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-md font-medium transition text-sm"
          >
            + {t('goals.card.addContribution')}
          </button>
        </div>
      </div>
    </Card>
  );
});
