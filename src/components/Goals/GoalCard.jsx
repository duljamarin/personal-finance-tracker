import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';

export default function GoalCard({ goal, onEdit, onAddContribution, onDelete }) {
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
    if (goal.is_completed) return 'text-green-600 dark:text-green-400';
    if (!daysLeft) return 'text-gray-500';
    if (daysLeft < 0) return 'text-red-600 dark:text-red-400';
    if (daysLeft < 30) return 'text-orange-600 dark:text-orange-400';
    return 'text-blue-600 dark:text-blue-400';
  };
  
  const getProgressColor = () => {
    if (displayProgress >= 100) return 'bg-green-500';
    if (displayProgress >= 75) return 'bg-blue-500';
    if (displayProgress >= 50) return 'bg-yellow-500';
    return 'bg-orange-500';
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
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {goal.name}
              </h3>
            </div>
            {goal.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                {goal.description}
              </p>
            )}
          </div>
          <div className="flex gap-1">
            <button
              onClick={() => onEdit(goal)}
              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition"
              title={t('goals.editGoal')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(goal)}
              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition"
              title={t('goals.deleteGoal')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-600 dark:text-gray-400">
                €{currentAmount.toFixed(2)} {t('goals.card.saved')}
              </span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                {displayProgress}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
              <div 
                className={`h-full ${getProgressColor()} transition-all duration-300`}
                style={{ width: `${displayProgress}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1 text-gray-500 dark:text-gray-400">
              <span>€0</span>
              <span>€{targetAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              {remaining > 0 ? (
                <>€{remaining.toFixed(2)} {t('goals.card.remaining')}</>
              ) : (
                <span className="text-green-600 dark:text-green-400 font-semibold">
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
              <span className="text-gray-500 dark:text-gray-400">
                {t('goals.card.noDeadline')}
              </span>
            )}
          </div>

          <button
            onClick={() => onAddContribution(goal)}
            className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition text-sm"
          >
            + {t('goals.card.addContribution')}
          </button>
        </div>
      </div>
    </Card>
  );
}
