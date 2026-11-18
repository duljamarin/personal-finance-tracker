import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Check, CalendarDays } from 'lucide-react';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import Card from '../UI/Card';
import Button from '../UI/Button';
import ProgressRing from '../UI/ProgressRing';
import { dataDelay } from '../../utils/motion';

const PRIORITY_KEY = { 1: 'high', 2: 'medium', 3: 'low' };

// One goal as a tile (spec 4.3): 104px ring, target date, priority chip,
// contribution button. A contribution changes current_amount and the ring arc
// eases to the new value; completed goals get a one-time pop of the ring.
export default memo(function GoalCard({ goal, onEdit, onAddContribution, onDelete, index }) {
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

  const ringColor = goal.is_completed ? 'var(--brand-text)' : (goal.color || 'var(--brand-text)');
  const priorityKey = PRIORITY_KEY[goal.priority];
  const iconBtn = 'btn-motion inline-flex items-center justify-center w-11 h-11 rounded-pill text-fg hover:bg-inner';

  return (
    <Card index={index} className="group flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          {priorityKey && (
            <span className="inline-flex items-center h-[30px] px-3 rounded-pill bg-inner text-sm font-bold text-fg">
              {t(`goals.priority.${priorityKey}`)}
            </span>
          )}
          {/* Goal color as data: a small swatch next to the priority chip. */}
          {goal.color && <span className="w-2.5 h-2.5 rounded-swatch" style={{ backgroundColor: goal.color }} aria-hidden="true" />}
        </div>
        <div className="flex shrink-0 -mr-2 -mt-2 sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100 btn-motion [@media(hover:none)]:opacity-100">
          <button type="button" onClick={() => onEdit(goal)} className={iconBtn} title={t('goals.editGoal')} aria-label={t('goals.editGoal')}>
            <Pencil className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => onDelete(goal)} className={`${iconBtn} hover:text-danger`} title={t('goals.deleteGoal')} aria-label={t('goals.deleteGoal')}>
            <Trash2 className="w-[18px] h-[18px]" strokeWidth={2} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-gap">
        <span className={goal.is_completed ? 'animate-pop' : ''}>
          <ProgressRing
            value={displayProgress / 100}
            size={104}
            color={ringColor}
            delay={dataDelay(index || 0)}
            labelClassName="text-fg"
            label={goal.is_completed ? '' : `${displayProgress}%`}
            sublabel={goal.is_completed ? <Check className="w-7 h-7 text-brand-text" strokeWidth={2.6} aria-label={t('goals.status.completed')} /> : null}
          />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="min-w-0 [overflow-wrap:anywhere] text-h3 font-bold text-fg">
            {goal.name}
          </h3>
          <p className="mt-1 [overflow-wrap:anywhere]">
            <span className="text-h1 font-extrabold tabular-nums text-fg">{fmt(currentAmount)}</span>
            <span className="block text-sm font-semibold text-fg tabular-nums">{t('goals.card.ofTarget', { amount: fmt(targetAmount) })}</span>
          </p>
        </div>
      </div>

      {goal.description && (
        <p className="mt-3 text-sm font-semibold text-fg line-clamp-2 [overflow-wrap:anywhere]">{goal.description}</p>
      )}

      {/* mt-auto pins the figures + action to the tile bottom so tiles in a
          row align whether or not they have a description. */}
      <div className="mt-auto">
        <dl className="mt-gap grid grid-cols-2 gap-3 text-sm [overflow-wrap:anywhere]">
          <div className="tile-inner px-3.5 py-2.5 min-w-0">
            <dt className="text-sm font-bold text-fg first-letter:uppercase">{t('goals.card.remaining')}</dt>
            <dd className="mt-0.5 font-extrabold tabular-nums text-fg [overflow-wrap:anywhere]">
              {goal.is_completed || remaining === 0
                ? <span className="text-brand-text">{t('goals.status.completed')}</span>
                : fmt(remaining)}
            </dd>
          </div>
          <div className="tile-inner px-3.5 py-2.5 min-w-0">
            <dt className="text-sm font-bold text-fg flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 shrink-0" strokeWidth={2} aria-hidden="true" />
              {t('goals.form.targetDate')}
            </dt>
            <dd className={`mt-0.5 font-extrabold tabular-nums ${daysLeft !== null && daysLeft < 0 && !goal.is_completed ? 'text-expense' : 'text-fg'}`}>
              {daysLeft === null
                ? t('goals.card.noDeadline')
                : daysLeft >= 0
                  ? t('goals.card.daysLeftCount', { count: daysLeft })
                  : t('goals.card.overdue')}
            </dd>
          </div>
        </dl>

        {perMonth !== null && (
          <p className="mt-3 text-sm font-semibold text-fg tabular-nums">
            {t('goals.card.perMonth', { amount: fmt(perMonth) })}
          </p>
        )}

        {!goal.is_completed && (
          <Button variant="secondary" type="button" onClick={() => onAddContribution(goal)} leading="plus" className="mt-gap w-full">
            {t('goals.card.addContribution')}
          </Button>
        )}
      </div>
    </Card>
  );
});
