import { useTranslation } from 'react-i18next';
import ProgressRing from '../UI/ProgressRing';
import ProgressBar from '../UI/ProgressBar';
import CategoryAvatar from '../UI/CategoryAvatar';
import { formatMonthName } from '../../utils/date';
import { linePath, MINUS } from '../../utils/bento';
import { delayStyle, tileDelay, dataDelay } from '../../utils/motion';
import { HERO, money, monthDate } from './demoData';

/**
 * Static Bento rendition of the dashboard with the landing demo dataset
 * (Landing/demoData.js): balance hero tile with a sparkline, health ring with
 * its change, the three fullest budgets and the last added transaction.
 * Deliberately plain HTML/SVG: no Recharts, no data fetch, nothing that can
 * delay the LCP heading (I5). Also used as the product preview next to the
 * auth forms (lg and up only there).
 *
 * Below 640px the tiles become one horizontal scroll row (snap, next tile
 * peeks) so the preview starts inside the first screen. Labels are short at
 * the copy level; nothing here truncates (R6).
 *
 * Decorative (aria-hidden inside): the copy around it carries the meaning;
 * a screen reader gets one label instead of a tour of sample numbers.
 */

// Tiles pop with tile delay(i) + 200ms.
const pop = (i) => ({ className: 'animate-pop', style: delayStyle(tileDelay(i) + 200) });
const signedDelta = (d) => `${d > 0 ? '+' : d < 0 ? MINUS : ''}${Math.abs(d)}`;

// Mobile: one snap row; the row bleeds into the hero block's 28px padding so
// tiles scroll edge to edge. From 640px: the 2-column grid.
const ROW = 'flex items-start gap-gap overflow-x-auto snap-x snap-mandatory -mx-7 px-7 scroll-px-7 pb-1 sm:grid sm:grid-cols-2 sm:overflow-visible sm:snap-none sm:mx-0 sm:px-0 sm:pb-0';
const CELL = 'shrink-0 min-w-[82%] snap-start sm:min-w-0';

export default function HeroPreview({ className = '' }) {
  const { t, i18n } = useTranslation();
  const month = formatMonthName(monthDate(0), i18n.language);
  const prevMonth = formatMonthName(monthDate(-1), i18n.language);
  const line = linePath(HERO.spark, 220, 80, 8);
  const p = [0, 1, 2, 3].map(pop);

  return (
    <div role="img" aria-label={t('landing.preview.label')} className={`select-none ${className}`}>
      <div aria-hidden="true" className={ROW} data-hero-preview>
        {/* Balance: the one hero tile */}
        <div className={`${p[0].className} ${CELL} tile tile-hero sm:col-span-2 p-tile-dense sm:p-tile flex flex-wrap items-end justify-between gap-5`} style={p[0].style}>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t('dashboard.balanceAllTime')}</p>
            <p className="mt-1.5 text-kpi font-extrabold tabular-nums">{money(HERO.balance, 2)}</p>
            <p className="mt-2.5 inline-flex px-3 py-1 rounded-pill bg-hero-inset text-sm font-bold tabular-nums">
              {t('landing.preview.keptIn', { amount: money(HERO.kept, 2), month })}
            </p>
          </div>
          <svg width="220" height="80" viewBox="0 0 220 80" className="max-w-full">
            <path d={line} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--white)' }} />
          </svg>
        </div>

        {/* Health score, with its change beside the ring (no empty half) */}
        <div className={`${p[1].className} ${CELL} tile p-tile-dense flex items-center gap-[18px]`} style={p[1].style}>
          <ProgressRing value={HERO.health / 100} size={92} animate={false} label={String(HERO.health)} labelClassName="text-fg" />
          <div className="min-w-0">
            <p className="font-bold text-fg">{t('healthScore.title')}</p>
            <p className="mt-1 text-sm font-bold text-brand-text tabular-nums">
              {t('landing.preview.vsMonth', { delta: signedDelta(HERO.healthDelta), month: prevMonth })}
            </p>
          </div>
        </div>

        {/* The three fullest budgets */}
        <div className={`${p[2].className} ${CELL} tile p-tile-dense flex flex-col gap-3`} style={p[2].style}>
          <p className="font-bold text-fg">{t('dashboard.budgetProgress')}</p>
          {HERO.budgets.map((b, i) => (
            <div key={b.key} data-budget={b.key}>
              <div className="flex flex-wrap justify-between gap-x-2 text-sm font-bold text-fg">
                <span>{t(`landing.demo.short.${b.key}`)}</span>
                <span className="tabular-nums">{money(b.spent)} / {money(b.limit)}</span>
              </div>
              {/* Width is budgetPct, the same rounded figure everywhere (D2). */}
              <ProgressBar ratio={b.pct / 100} height={6} delay={dataDelay(2) + 200 + i * 80} className="mt-1.5" />
            </div>
          ))}
        </div>

        {/* Last added transaction */}
        <div className={`${p[3].className} ${CELL} tile sm:col-span-2 px-[22px] py-[18px] flex items-center gap-[14px]`} style={p[3].style}>
          <CategoryAvatar category={{ name: HERO.lastTx.iconKey }} size="md" />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-fg">{t(`landing.preview.tx.${HERO.lastTx.key}`)}</p>
            <p className="text-sm font-semibold text-fg">{t(`landing.demo.short.${HERO.lastTx.category}`)} · {t('landing.preview.addedJustNow')}</p>
          </div>
          <p className="text-h3 font-extrabold tabular-nums text-fg whitespace-nowrap">{MINUS}{money(HERO.lastTx.amount, 2)}</p>
        </div>
      </div>
    </div>
  );
}
