import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Check } from 'lucide-react';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

const RING = 2 * Math.PI * 22; // circumference for r=22

function ProgressRing({ percent, color }) {
  const pct = Math.max(0, Math.min(100, percent));
  return (
    <svg viewBox="0 0 52 52" className="w-14 h-14 -rotate-90 shrink-0" aria-hidden="true">
      <circle cx="26" cy="26" r="22" fill="none" strokeWidth="5" className="stroke-surface-hairline dark:stroke-surface-dark-hairline" />
      <circle
        cx="26" cy="26" r="22" fill="none" strokeWidth="5" strokeLinecap="round"
        stroke={color}
        strokeDasharray={RING}
        strokeDashoffset={RING * (1 - pct / 100)}
        className="transition-[stroke-dashoffset] duration-500"
      />
    </svg>
  );
}

export default memo(function GoalCard({ goal, onEdit, onAddContribution, onDelete }) {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();

  const targetAmount = Number(goal.target_amount) || 0;
  const currentAmount = Number(goal.current_amount) || 0;
  const progress = targetAmount > 0 ? Math.round((currentAmount / targetAmount) * 100) : 0;
  const displayProgress = Math.min(progress, 100);
  const remaining = Math.max(0, targetAmount - currentAmount);

  const daysLeft = goal.target_date
    ? Math.ceil((new Date(goal.target_date + 'T23:59:59') - new Date()) / (1000 * 60 * 60 * 24))
    : null;
  // What it takes to hit the date, the number people actually plan around.
  const monthsLeft = daysLeft !== null && daysLeft > 0 ? Math.max(1, daysLeft / 30.44) : null;
  const perMonth = !goal.is_completed && remaining > 0 && monthsLeft ? remaining / monthsLeft : null;

  const ringColor = goal.is_completed ? 'var(--c-income)' : (goal.color || 'var(--c-income)');

  return (
    <div className="group bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-4 sm:p-5 flex flex-col">
      <div className="flex items-start gap-4">
        <div className="relative">
          <ProgressRing percent={displayProgress} color={ringColor} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold tabular-nums text-ink-primary dark:text-white">
            {goal.is_completed ? <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" strokeWidth={2.5} /> : `${displayProgress}%`}
          </span>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="min-w-0 [overflow-wrap:anywhere] text-sm font-medium text-ink-primary dark:text-white">
            {goal.name}
          </h3>
          <p className="mt-1 [overflow-wrap:anywhere]">
            <span className="text-xl font-semibold tabular-nums tracking-tight text-ink-primary dark:text-white">{fmt(currentAmount)}</span>
            <span className="ml-1.5 text-sm text-ink-muted dark:text-white tabular-nums">{t('goals.card.ofTarget', { amount: fmt(targetAmount) })}</span>
          </p>
        </div>

        <div className="flex gap-0.5 shrink-0 -mr-1.5 -mt-1 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(goal)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-ink-primary hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
            title={t('goals.editGoal')}
            aria-label={t('goals.editGoal')}
          >
            <Pencil className="w-4 h-4" strokeWidth={1.75} />
          </button>
          <button
            onClick={() => onDelete(goal)}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink-muted dark:text-white hover:text-expense dark:hover:text-expense hover:bg-expense/5 transition-colors"
            title={t('goals.deleteGoal')}
            aria-label={t('goals.deleteGoal')}
          >
            <Trash2 className="w-4 h-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {goal.description && (
        <p className="mt-3 text-sm text-ink-muted dark:text-white line-clamp-2 [overflow-wrap:anywhere]">{goal.description}</p>
      )}

      {/* mt-auto pins the figures + action to the card bottom so cards in a
          row align whether or not they have a description. */}
      <div className="mt-auto">
      <dl className="mt-4 pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline grid grid-cols-2 gap-3 text-sm">
        <div className="min-w-0">
          <dt className="eyebrow first-letter:uppercase">{t('goals.card.remaining')}</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-ink-primary dark:text-white [overflow-wrap:anywhere]">
            {goal.is_completed || remaining === 0
              ? <span className="text-brand-600 dark:text-brand-400">{t('goals.status.completed')}</span>
              : fmt(remaining)}
          </dd>
        </div>
        <div className="min-w-0 text-right">
          <dt className="eyebrow">{t('goals.form.targetDate')}</dt>
          <dd className={`mt-0.5 font-medium tabular-nums ${daysLeft !== null && daysLeft < 0 && !goal.is_completed ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
            {daysLeft === null
              ? t('goals.card.noDeadline')
              : daysLeft >= 0
                ? t('goals.card.daysLeftCount', { count: daysLeft })
                : t('goals.card.overdue')}
          </dd>
        </div>
      </dl>

      {perMonth !== null && (
        <p className="mt-3 text-xs text-ink-muted dark:text-white tabular-nums">
          {t('goals.card.perMonth', { amount: fmt(perMonth) })}
        </p>
      )}

      {!goal.is_completed && (
        <button
          onClick={() => onAddContribution(goal)}
          className="mt-4 w-full py-2 rounded-md border border-surface-outline dark:border-surface-dark-outline text-sm font-medium text-ink-primary dark:text-white hover:bg-ink-primary/5 dark:hover:bg-ink-dark-primary/10 transition-colors"
        >
          {t('goals.card.addContribution')}
        </button>
      )}
      </div>
    </div>
  );
});
