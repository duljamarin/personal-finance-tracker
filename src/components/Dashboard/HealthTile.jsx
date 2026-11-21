import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import ProgressRing from '../UI/ProgressRing';
import Skeleton from '../UI/Skeleton';
import { useCountUp } from '../../hooks/useCountUp';
import { dataDelay } from '../../utils/motion';
import { MINUS } from '../../utils/bento';

function scoreLabelKey(value) {
  if (value >= 80) return 'healthScore.excellent';
  if (value >= 60) return 'healthScore.good';
  if (value >= 40) return 'healthScore.needsWork';
  return 'healthScore.poor';
}

// Trend word from the month-over-month change (the landing demo's "Improving").
function trendKey(delta) {
  if (delta > 0) return 'dashboard.healthTrend.up';
  if (delta < 0) return 'dashboard.healthTrend.down';
  return 'dashboard.healthTrend.flat';
}

const pctText = (v) => (v === null || v === undefined ? '–' : `${v < 0 ? MINUS : ''}${Math.abs(v)}%`);

/**
 * Health score tile (spec 4.1, row 1): 140px ring with the score and its
 * change vs last month; beside it the trend (improving / slipping / steady,
 * or the score band before there is a previous month) and three plain
 * figures for the selected month: saving rate, budgets kept, goals on track
 * (utils/finance/dashboardModel). The four weighted pillars live in the
 * HealthScore details card, with their Premium gating unchanged.
 *
 * stats: { savingRate: number|null, budgets: { kept, total, pct }, goals: { onTrack, total } }
 */
export default function HealthTile({ score, prevScore, stats, loading, index = 1, className = '' }) {
  const { t } = useTranslation();
  const delay = dataDelay(index);
  const total = score ? Math.min(100, Math.round(score.totalScore)) : 0;
  const shown = useCountUp(total, { delay });

  if (loading && !score) {
    return (
      <Card index={index} className={`min-h-[220px] flex items-center gap-[22px] ${className}`}>
        <Skeleton variant="circle" className="!w-[140px] !h-[140px]" />
        <div className="flex-1 space-y-3"><Skeleton variant="heading" /><Skeleton /><Skeleton /><Skeleton /></div>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card index={index} className={`min-h-[220px] flex flex-col justify-center ${className}`}>
        <h2 className="text-h3 font-bold text-fg">{t('healthScore.title')}</h2>
        <p className="mt-2 text-base font-bold text-fg">{t('healthScore.noData')}</p>
        <p className="mt-1 text-sm font-semibold text-fg">{t('healthScore.noDataDesc')}</p>
      </Card>
    );
  }

  const delta = typeof prevScore === 'number' ? Math.round(score.totalScore - prevScore) : null;
  const deltaText = delta === null ? null : `${delta >= 0 ? '+' : MINUS}${Math.abs(delta)}`;

  return (
    <Card index={index} className={`min-h-[220px] flex flex-wrap items-center gap-[22px] ${className}`}>
      <ProgressRing
        value={total / 100}
        size={140}
        delay={delay}
        label={String(Math.round(shown))}
        ariaLabel={`${t('healthScore.title')}: ${total}`}
        labelClassName="text-fg"
        sublabel={deltaText && (
          <span className={`text-sm font-bold tabular-nums ${delta >= 0 ? 'text-brand-text' : 'text-fg'}`}>
            <span className="sr-only">{t('dashboard.healthDelta', { value: deltaText })}</span>
            <span aria-hidden="true">{deltaText}</span>
          </span>
        )}
      />
      <div className="flex-1 basis-[180px] min-w-0 flex flex-col gap-2.5">
        <div>
          <h2 className="text-h3 font-bold text-fg">{t('healthScore.title')}</h2>
          {/* Brand only for good news (like the ring's delta): a drop or no
              change stays ink. */}
          <p className={`text-sm font-bold ${delta === null || delta > 0 ? 'text-brand-text' : 'text-fg'}`}>
            {t(delta === null ? scoreLabelKey(total) : trendKey(delta))}
          </p>
        </div>
        <dl className="flex flex-col gap-2">
          {[
            [pctText(stats?.savingRate), 'dashboard.healthStats.savingRate'],
            [stats?.budgets?.total ? pctText(stats.budgets.pct) : '–', 'dashboard.healthStats.budgetsKept'],
            [stats?.goals?.total ? `${stats.goals.onTrack}/${stats.goals.total}` : '–', 'dashboard.healthStats.goalsOnTrack'],
          ].map(([value, labelKey]) => (
            <div key={labelKey} className="flex items-baseline gap-3 text-sm font-semibold text-fg">
              <dt className="order-2 min-w-0">{t(labelKey)}</dt>
              <dd className="order-1 m-0 min-w-[3.25rem] text-base font-extrabold tabular-nums whitespace-nowrap">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  );
}
