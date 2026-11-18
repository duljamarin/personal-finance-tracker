import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import Card from '../UI/Card';
import ProgressRing from '../UI/ProgressRing';
import Skeleton from '../UI/Skeleton';
import { useCountUp } from '../../hooks/useCountUp';
import { dataDelay } from '../../utils/motion';
import { MINUS } from '../../utils/bento';
import { healthPoints } from '../../utils/finance/dashboardModel';

function scoreLabelKey(value) {
  if (value >= 80) return 'healthScore.excellent';
  if (value >= 60) return 'healthScore.good';
  if (value >= 40) return 'healthScore.needsWork';
  return 'healthScore.poor';
}

/**
 * Health score tile (spec 4.1, row 1): 140px ring with the score and its
 * change vs last month, plus the four pillars as weighted points (x/40,
 * x/30, x/20, x/10, they add up to the score). Pillar values stay locked for
 * free plans, exactly as in the full HealthScore card (gating unchanged).
 */
export default function HealthTile({ score, prevScore, loading, isPaid, index = 1, className = '' }) {
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
          <p className="text-sm font-bold text-brand-text">{t(scoreLabelKey(total))}</p>
        </div>
        <ul className="flex flex-col gap-2">
          {healthPoints(score).map((p) => (
            <li key={p.key} className="flex justify-between gap-3 text-sm font-semibold text-fg">
              <span className="min-w-0">{t(p.labelKey)}</span>
              {isPaid ? (
                <span className="font-extrabold tabular-nums whitespace-nowrap">
                  <span aria-hidden="true">{p.points}/{p.weight}</span>
                  <span className="sr-only">{t('dashboard.healthPoints', { value: p.points, max: p.weight })}</span>
                </span>
              ) : (
                <Lock className="w-4 h-4 shrink-0" strokeWidth={2} aria-label={t('healthScore.unlockFull')} />
              )}
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}
