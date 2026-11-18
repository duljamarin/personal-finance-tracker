import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../UI/Card';
import ProgressRing from '../UI/ProgressRing';
import Skeleton from '../UI/Skeleton';
import { fetchGoals } from '../../utils/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useCountUp } from '../../hooks/useCountUp';
import { dataDelay, STAGGER } from '../../utils/motion';

function GoalCardMini({ goal, delay }) {
  const { t } = useTranslation();
  const { format } = useDisplayCurrency();
  const target = Number(goal.target_amount) || 0;
  const current = Number(goal.current_amount) || 0;
  const ratio = target > 0 ? Math.min(1, current / target) : 0;
  const pct = useCountUp(Math.round(ratio * 100), { delay });
  return (
    <Link to="/goals" className="tile-inner px-3.5 py-[18px] flex flex-col items-center text-center gap-2.5 btn-motion hover:bg-inner-2 min-w-0">
      <ProgressRing value={ratio} size={104} track="tile" delay={delay} label={`${Math.round(pct)}%`} labelClassName="text-fg" />
      <span className="font-extrabold text-fg [overflow-wrap:anywhere]">{goal.name}</span>
      <span className="text-sm font-semibold text-fg tabular-nums">
        {t('dashboard.goalOf', { current: format(current, { decimals: 0 }), target: format(target, { decimals: 0 }) })}
      </span>
    </Link>
  );
}

/** Goals tile (spec 4.1, row 2): up to two active goals with a 104px ring. */
export default function GoalsTile({ reloadTrigger, index = 3, className = '' }) {
  const { t } = useTranslation();
  const delay = dataDelay(index);
  const { data: goals, loading } = useAsyncData(() => fetchGoals(), [reloadTrigger], []);
  const active = (goals || []).filter((g) => !g.is_completed && g.is_active !== false).slice(0, 2);

  return (
    <Card index={index} className={`min-h-[220px] flex flex-col ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 font-bold text-fg">{t('goals.title')}</h2>
        <Link to="/goals" className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-text">
          {t('dashboard.viewGoals')}
          <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
      {loading && active.length === 0 ? (
        <div className="mt-gap grid grid-cols-2 gap-3"><Skeleton variant="card" className="!rounded-inner !h-[200px]" /><Skeleton variant="card" className="!rounded-inner !h-[200px]" /></div>
      ) : active.length === 0 ? (
        <p className="mt-3 text-base font-semibold text-fg">{t('dashboard.noGoals')}</p>
      ) : (
        <div className="mt-gap grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3">
          {active.map((g, i) => <GoalCardMini key={g.id} goal={g} delay={delay + i * STAGGER} />)}
        </div>
      )}
    </Card>
  );
}
