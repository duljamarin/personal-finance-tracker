import { useTranslation } from 'react-i18next';
import { CategoryIconSvg } from '../UI/CategoryIconSvg';
import ProgressRing from '../UI/ProgressRing';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatMonthName } from '../../utils/date';
import { tintOf, linePath } from '../../utils/bento';
import { delayStyle, tileDelay } from '../../utils/motion';

/**
 * Static Bento rendition of the dashboard (spec 4.6) with the product's own
 * sample data: balance hero tile with a sparkline, health ring, one budget
 * and the last added transaction. Deliberately plain HTML/SVG: no Recharts,
 * no data fetch, nothing that can delay the LCP heading (I5). Also used as
 * the product preview next to the auth forms.
 *
 * Decorative (aria-hidden inside): the copy around it carries the meaning;
 * a screen reader gets one label instead of a tour of sample numbers.
 */

// Sample data (the same figures the preview has always shown).
const INCOME = 3800;
const SPENDING = 1402.6;
const BALANCE = 12480.35;
// Six months of income/expense in thousands, oldest first; the sparkline is
// their running balance ending at BALANCE.
const MONTHS = [[3.2, 1.9], [3.4, 1.5], [3.2, 2.1], [3.6, 1.7], [3.4, 1.65], [3.8, 1.4]];
const SPARK = MONTHS.reduce((acc, [inc, exp]) => [...acc, acc[acc.length - 1] + (inc - exp)], [0]);
const HEALTH = 78;
const BUDGET = { cat: 'Food & Dining', pct: 68 };
const LAST_TX = { key: 'market', cat: 'Food & Dining', amount: '−€64.20', color: 'var(--c-data-sand)' };

const eur = (n) => `€${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Tiles pop with tile delay(i) + 200ms (spec 4.6).
const pop = (i) => ({ className: 'animate-pop', style: delayStyle(tileDelay(i) + 200) });

export default function HeroPreview({ className = '' }) {
  const { t, i18n } = useTranslation();
  const month = formatMonthName(new Date(), i18n.language);
  const line = linePath(SPARK, 220, 80, 8);

  return (
    <div role="img" aria-label={t('landing.preview.label')} className={`select-none ${className}`}>
      <div aria-hidden="true" className="grid grid-cols-2 gap-gap">
        {/* Balance: the one hero tile */}
        <div {...pop(0)} className={`${pop(0).className} tile tile-hero col-span-2 p-tile-dense sm:p-tile flex flex-wrap items-end justify-between gap-5`}>
          <div className="min-w-0">
            <p className="text-sm font-semibold">{t('dashboard.balanceAllTime')}</p>
            <p className="mt-1.5 text-kpi font-extrabold tabular-nums">{eur(BALANCE)}</p>
            <p className="mt-2.5 inline-flex px-3 py-1 rounded-pill bg-hero-inset text-sm font-bold tabular-nums">
              {t('landing.preview.keptIn', { amount: eur(INCOME - SPENDING), month })}
            </p>
          </div>
          <svg width="220" height="80" viewBox="0 0 220 80" className="max-w-full">
            <path d={line} fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: 'var(--white)' }} />
          </svg>
        </div>

        {/* Health score */}
        <div {...pop(1)} className={`${pop(1).className} tile p-tile-dense flex flex-wrap items-center gap-[18px] min-w-0`}>
          <ProgressRing value={HEALTH / 100} size={92} animate={false} label={String(HEALTH)} labelClassName="text-fg" />
          <p className="font-bold text-fg min-w-0">{t('healthScore.title')}</p>
        </div>

        {/* One budget */}
        <div {...pop(2)} className={`${pop(2).className} tile p-tile-dense min-w-0`}>
          <div className="flex justify-between gap-2 font-bold text-fg">
            <span className="truncate">{translateCategoryName(BUDGET.cat)}</span>
            <span className="tabular-nums">{BUDGET.pct}%</span>
          </div>
          <div className="h-3.5 mt-3.5 rounded-pill bg-inner-2 overflow-hidden">
            <div className="h-full rounded-pill bg-brand-600 dark:bg-brand-400" style={{ width: `${BUDGET.pct}%` }} />
          </div>
          <p className="mt-2.5 text-sm font-semibold text-fg">{t('dashboard.budgetProgress')}</p>
        </div>

        {/* Last added transaction */}
        <div {...pop(3)} className={`${pop(3).className} tile col-span-2 px-[22px] py-[18px] flex items-center gap-[14px] min-w-0`}>
          <span className="w-11 h-11 rounded-input flex items-center justify-center shrink-0" style={{ color: LAST_TX.color, backgroundColor: tintOf(LAST_TX.color) }}>
            <CategoryIconSvg iconKey={LAST_TX.cat} className="w-[22px] h-[22px]" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-fg truncate">{t(`landing.preview.tx.${LAST_TX.key}`)}</p>
            <p className="text-sm font-semibold text-fg truncate">{translateCategoryName(LAST_TX.cat)} · {t('landing.preview.addedJustNow')}</p>
          </div>
          <p className="text-h3 font-extrabold tabular-nums text-fg">{LAST_TX.amount}</p>
        </div>
      </div>
    </div>
  );
}
