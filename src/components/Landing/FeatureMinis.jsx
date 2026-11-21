import { useTranslation } from 'react-i18next';
import ProgressRing from '../UI/ProgressRing';
import CategoryAvatar from '../UI/CategoryAvatar';
import { MINUS } from '../../utils/bento';
import { progressColor } from '../../utils/chartColors';
import { formatMonthShort } from '../../utils/date';
import { FEATURES, CURRENCY, LAST_TX, category, money, moneyK } from './demoData';

const LAST_TX_ICON = category(LAST_TX.category).iconKey;

/**
 * Small static renders inside the landing feature tiles. Every number comes
 * from Landing/demoData.js (FEATURES), so the score here is the hero's score
 * and the food budget here is the hero's food budget (D1, D2).
 */

// A month above your own normal uses the palette's sand, not red (V4: red is
// for over-budget and errors only).
const HEAVY_COLOR = 'var(--c-data-sand)';
const signedPct = (pct) => (pct === 0 ? '0%' : `${pct > 0 ? '+' : MINUS}${Math.abs(pct)}%`);

/** Score: ring with the three parts a visitor can read beside it. */
export function MiniHealthScore() {
  const { t } = useTranslation();
  const { health, savingsRate, budgetsKeptPct, goalsOnTrack } = FEATURES.score;
  const stats = [
    [`${savingsRate}%`, 'landing.demo.savings'],
    [`${budgetsKeptPct}%`, 'landing.demo.budget'],
    [goalsOnTrack, 'landing.demo.goals'],
  ];
  return (
    // The parts sit beside the ring when there is room for them (10rem),
    // under it on a phone.
    <div className="flex flex-wrap items-center gap-5" data-score={health}>
      <ProgressRing
        value={health / 100}
        size={120}
        animate={false}
        label={String(health)}
        labelClassName="text-fg"
      />
      <div className="flex-1 min-w-[10rem]">
        <p className="text-sm font-bold text-brand-text">{t('landing.demo.scoreGood')}</p>
        <dl className="mt-2 flex flex-col gap-2">
          {stats.map(([v, k]) => (
            <div key={k} className="flex items-baseline gap-2.5">
              <dt className="order-2 text-sm font-semibold text-fg">{t(k)}</dt>
              <dd className="order-1 m-0 min-w-[3.5rem] text-h3 font-extrabold text-fg tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

/** Benchmarks: this month vs the user's own average, per category. */
export function MiniBenchmarks() {
  const { t } = useTranslation();
  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {FEATURES.benchmarks.map(({ key, pct }) => (
          <div key={key} className="tile-inner px-gap py-3 min-w-0">
            <p className="text-sm font-bold text-fg">{t(`landing.demo.budgetItems.${key}`)}</p>
            <p className={`mt-1 text-h1 font-extrabold tabular-nums ${pct > 0 ? 'text-warning' : pct < 0 ? 'text-brand-text' : 'text-fg'}`}>
              {signedPct(pct)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-sm font-semibold text-fg">{t('landing.demo.vsLastMonth')}</p>
    </div>
  );
}

/**
 * Budget forecast: spent so far, the month-end projection at this pace (the
 * same linear forecast BudgetCard uses) and the limit marker.
 */
function ForecastBar({ spent, limit, projected }) {
  const exceeds = projected > limit;
  const scale = Math.max(limit, spent, projected) || 1;
  const pct = (v) => `${Math.min(100, (v / scale) * 100)}%`;
  return (
    <div className="relative h-2.5 mt-2">
      <div className="absolute inset-0 rounded-pill bg-inner-2 overflow-hidden">
        <div className="h-full rounded-pill" style={{ width: pct(spent), backgroundColor: progressColor(spent / limit) }} />
      </div>
      {exceeds && (
        <div
          className="absolute top-0 bottom-0 border-2 border-dashed border-l-0 rounded-r-pill"
          style={{ left: pct(spent), width: `calc(${pct(projected)} - ${pct(spent)})`, borderColor: 'var(--c-warning)' }}
        />
      )}
      <div className="absolute -top-1.5 -bottom-1.5 w-[2px] rounded-swatch bg-fg" style={{ left: pct(limit) }} />
    </div>
  );
}

export function MiniBudgetForecast() {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col gap-4" aria-hidden="true">
      {FEATURES.forecast.map(({ key, spent, limit, projected, exceedBy, willExceed }) => (
        <div key={key} data-budget={key}>
          <div className="flex flex-wrap justify-between gap-x-3 text-sm font-bold text-fg">
            <span>{t(`landing.demo.budgetItems.${key}`)}</span>
            <span className="tabular-nums">{money(spent)} / {money(limit)}</span>
          </div>
          <ForecastBar spent={spent} limit={limit} projected={projected} />
          <p className={`mt-1.5 text-sm tabular-nums ${willExceed ? 'font-bold text-warning' : 'font-semibold text-fg'}`}>
            {willExceed
              ? t('budgets.forecast.willExceed', { amount: money(exceedBy) })
              : t('budgets.forecast.onTrack', { amount: money(projected) })}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Twelve months of spending, flagged against your own normal. */
export function MiniYear() {
  const { t, i18n } = useTranslation();
  const { months, max, totals } = FEATURES.year;
  return (
    <div>
      <div className="mb-3 text-sm font-semibold text-fg">
        <span className="flex flex-wrap items-center gap-x-3">
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-swatch" style={{ backgroundColor: 'var(--brand-text)' }} />{t('landing.demo.onTrack')}</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-swatch" style={{ backgroundColor: HEAVY_COLOR }} />{t('landing.demo.highSpend')}</span>
        </span>
      </div>
      <div className="flex items-end gap-[3px] sm:gap-1 h-20 w-full" aria-hidden="true">
        {months.map(({ date, spending, aboveNormal }) => (
          <div key={date.getTime()} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
            <div
              className="w-full rounded-t-swatch"
              style={{ height: `${(spending / max) * 100}%`, backgroundColor: aboveNormal ? HEAVY_COLOR : 'var(--brand-text)' }}
            />
            <span className="text-min font-bold text-fg">{formatMonthShort(date, i18n.language).charAt(0).toUpperCase()}</span>
          </div>
        ))}
      </div>
      <dl className="grid grid-cols-3 gap-2 mt-4">
        <div className="tile-inner px-3 py-2.5 min-w-0">
          <dt className="text-sm font-bold text-fg">{t('landing.demo.income')}</dt>
          <dd className="m-0 font-extrabold text-brand-text tabular-nums">{moneyK(totals.income)}</dd>
        </div>
        <div className="tile-inner px-3 py-2.5 min-w-0">
          <dt className="text-sm font-bold text-fg">{t('landing.demo.expenses')}</dt>
          <dd className="m-0 font-extrabold text-fg tabular-nums">{moneyK(totals.spending)}</dd>
        </div>
        <div className="tile-inner px-3 py-2.5 min-w-0">
          <dt className="text-sm font-bold text-fg">{t('landing.demo.saved')}</dt>
          <dd className="m-0 font-extrabold text-fg tabular-nums">+{moneyK(totals.kept)}</dd>
        </div>
      </dl>
    </div>
  );
}

/*
 * How-it-works snippets: one small static UI piece per step, from the same
 * dataset (decorative; the step copy carries the meaning).
 */

/** Step 1: currency and language picked at setup. */
export function StepAccountSnippet() {
  const chip = 'inline-flex items-center h-9 px-4 rounded-pill border-2 border-line text-sm font-bold text-fg tabular-nums';
  return (
    <div className="flex flex-wrap gap-2" aria-hidden="true">
      <span className={chip}>{CURRENCY}</span>
      <span className={chip}>EN / SQ</span>
    </div>
  );
}

/** Step 2: the last transaction and one recurring entry. */
export function StepMoneySnippet() {
  const { t } = useTranslation();
  const rent = category('housing');
  const rows = [
    { iconKey: LAST_TX_ICON, label: t(`landing.preview.tx.${LAST_TX.key}`), amount: money(LAST_TX.amount, 2) },
    { iconKey: rent.iconKey, label: `${t('landing.preview.tx.rent')} · ${t('recurring.monthly')}`, amount: money(rent.spent) },
  ];
  return (
    <div className="tile-inner p-3 flex flex-col gap-2.5" aria-hidden="true">
      {rows.map((r) => (
        <div key={r.label} className="flex items-center gap-3 min-w-0">
          <CategoryAvatar category={{ name: r.iconKey }} size="sm" />
          <span className="flex-1 min-w-0 text-sm font-bold text-fg">{r.label}</span>
          <span className="text-sm font-extrabold text-fg tabular-nums whitespace-nowrap">{MINUS}{r.amount}</span>
        </div>
      ))}
    </div>
  );
}

/** Step 3: the score, the same HEALTH as everywhere else. */
export function StepScoreSnippet() {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-4" aria-hidden="true">
      <ProgressRing value={FEATURES.score.health / 100} size={64} stroke={14} animate={false} label={String(FEATURES.score.health)} labelClassName="text-fg" />
      <p className="text-sm font-bold text-fg">{t('healthScore.title')}</p>
    </div>
  );
}
