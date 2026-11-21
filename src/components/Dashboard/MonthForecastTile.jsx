import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock, Check } from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, CartesianGrid, Area, Line, XAxis, YAxis, Tooltip, ReferenceLine, ReferenceDot,
} from 'recharts';
import Card from '../UI/Card';
import Skeleton from '../UI/Skeleton';
import StackedBar from '../UI/StackedBar';
import ProgressBar from '../UI/ProgressBar';
import { useMonthForecast } from '../../hooks/useMonthForecast';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import { FORECAST_PREMIUM_SCOPE } from '../../utils/finance/forecast/forecastConfig';
import { UNCATEGORIZED } from '../../utils/finance/forecast/forecastEngine';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatMonthName, formatMonthShort, formatShortDay, getDateLocale } from '../../utils/date';
import { parseYMD } from '../../utils/finance/calendar';
import { MINUS } from '../../utils/bento';
import {
  AXIS_PROPS, CHART_GRID, CHART_MARGIN, CHART_TOOLTIP_CLASS, LINE_MARK, PROJECTION_DASH, BAND_OPACITY, END_DOT_RADIUS, Y_AXIS_WIDTH, useChartAnimation,
} from '../../utils/chartTheme';

/**
 * "End-of-month forecast". Every number comes from useMonthForecast ->
 * forecastEngine; this component only formats and lays them out.
 *
 * Free (FORECAST_PREMIUM_SCOPE 'breakdown'): the verdict, its range and the
 * month as a line (actual so far, the forecast and its band). Premium adds
 * where the money goes, what can still be spent per day, the breakdown with
 * the scheduled list, and each budget at month end. Gating follows
 * FORECAST_PREMIUM_SCOPE alone.
 */

// U+2060 WORD JOINER keeps a sign glued to its amount at a line break.
const JOIN = '⁠';
const signed = (value, format) => `${value < 0 ? MINUS : '+'}${JOIN}${format(Math.abs(value))}`;
const minus = (value, format) => `${MINUS}${JOIN}${format(value)}`;
const dateFromYMD = (value) => {
  const { y, m, d } = parseYMD(value);
  return new Date(y, m - 1, d);
};

const BRAND = 'var(--brand-text)';
const MAP_COLORS = {
  spent: 'var(--c-data-blue)',
  scheduled: 'var(--c-data-sand)',
  everyday: 'var(--c-data-gold)',
  left: BRAND,
};

function ForecastTooltip({ active, payload, format, dayLabel, t }) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="font-extrabold mb-1">{dayLabel(point.date)}</p>
      {point.actual !== null && <p>{t('forecast.chart.actual')}: {signed(point.actual, format)}</p>}
      {point.projected !== null && point.actual === null && (
        <>
          <p className="text-brand-text">{t('forecast.chart.projected')}: {signed(point.projected, format)}</p>
          {point.pessimistic !== point.optimistic && (
            <p>{t('forecast.chart.range', { low: signed(point.pessimistic, format), high: signed(point.optimistic, format) })}</p>
          )}
        </>
      )}
    </div>
  );
}

/** The month as a line: actual net so far, then the forecast and its band. */
function ForecastChart({ f, format, monthLabel }) {
  const { t, i18n } = useTranslation();
  const anim = useChartAnimation();
  const dayLabel = (date) => t('forecast.chart.dayTick', { day: parseYMD(date).d, month: formatMonthShort(dateFromYMD(date), i18n.language) });
  const first = f.DAILY[0];
  const lastPoint = f.DAILY[f.DAILY.length - 1];
  const dateOfDay = (day) => (f.DAILY.find((p) => p.day === day) || first).date;
  return (
    <div className="h-56" role="img" aria-label={t('forecast.chart.label', { month: monthLabel })}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={f.DAILY} margin={CHART_MARGIN}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis
            dataKey="day"
            {...AXIS_PROPS}
            ticks={[first.day, f.DAYS_ELAPSED, f.DAYS_IN_MONTH]}
            tickFormatter={(day) => dayLabel(dateOfDay(day))}
            interval={0}
          />
          <YAxis {...AXIS_PROPS} width={Y_AXIS_WIDTH} domain={['auto', 'auto']} tickFormatter={(v) => format(v, { compact: true })} />
          <Tooltip content={<ForecastTooltip format={format} dayLabel={dayLabel} t={t} />} cursor={{ stroke: 'var(--line)' }} />
          <ReferenceLine y={0} stroke="var(--line)" />
          <ReferenceLine
            x={f.DAYS_ELAPSED}
            stroke="var(--text)"
            strokeDasharray={PROJECTION_DASH}
            label={{ value: t('forecast.chart.today'), position: 'insideTopLeft', ...AXIS_PROPS.tick }}
          />
          <Area dataKey="range" stroke="none" fill={BRAND} fillOpacity={BAND_OPACITY} {...anim} />
          <Line dataKey="actual" stroke={BRAND} {...LINE_MARK} {...anim} />
          <Line dataKey="projected" stroke={BRAND} {...LINE_MARK} strokeDasharray={PROJECTION_DASH} {...anim} />
          <ReferenceDot x={lastPoint.day} y={f.PROJECTED_NET} r={END_DOT_RADIUS} fill={BRAND} stroke="var(--tile)" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Free plan: what Premium adds, as a list (no blurred numbers). */
function PremiumPanel() {
  const { t } = useTranslation();
  const items = ['safe', 'map', 'scheduled', 'budgets'];
  return (
    <div className="tile-inner p-gap">
      <p className="flex items-center gap-2 font-bold text-fg">
        <Lock className="w-4 h-4 shrink-0 text-brand-text" strokeWidth={2.4} aria-hidden="true" />
        {t('forecast.locked.title')}
      </p>
      <ul className="mt-2 grid sm:grid-cols-2 gap-x-gap gap-y-1.5 list-none m-0 p-0">
        {items.map((key) => (
          <li key={key} className="flex items-start gap-2 text-sm font-semibold text-fg">
            <Check className="w-4 h-4 mt-0.5 shrink-0 text-brand-text" strokeWidth={2.6} aria-hidden="true" />
            {t(`forecast.locked.items.${key}`)}
          </li>
        ))}
      </ul>
      <Link to="/pricing" className="mt-2 inline-flex items-center min-h-11 text-sm font-bold text-brand-text underline-offset-4 hover:underline">
        {t('forecast.locked.cta')}
      </Link>
    </div>
  );
}

function StatBox({ title, value, tone = 'text-fg', children }) {
  return (
    <div className="tile-inner p-gap min-w-0">
      <p className="text-sm font-bold text-fg">{title}</p>
      {value !== undefined && <p className={`mt-1 text-h3 font-extrabold tabular-nums ${tone}`}>{value}</p>}
      {children}
    </div>
  );
}

export default function MonthForecastTile({ index, className = '' }) {
  const { t, i18n } = useTranslation();
  const { format } = useDisplayCurrency();
  const { isPremium, isTrialing } = useSubscription() || {};
  const { categories = [] } = useTransactions() || {};
  const { forecast: f, loading, isEmpty } = useMonthForecast();
  const [showScheduled, setShowScheduled] = useState(false);

  const paid = Boolean(isPremium || isTrialing);
  const cardLocked = FORECAST_PREMIUM_SCOPE === 'all' && !paid;
  const detailLocked = FORECAST_PREMIUM_SCOPE !== 'none' && !paid;
  const month = formatMonthName(new Date(), i18n.language);
  const percent = new Intl.NumberFormat(getDateLocale(i18n.language), { style: 'percent', maximumFractionDigits: 0 });
  const categoryName = (id) => {
    if (id === UNCATEGORIZED) return t('forecast.uncategorized');
    return translateCategoryName(categories.find((c) => c.id === id)?.name || '');
  };
  const addExpense = () => window.dispatchEvent(new CustomEvent('openAddTransaction'));

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-h3 font-bold text-fg">{t('forecast.title')}</h2>
        {f && !isEmpty && !cardLocked && (
          <p className="text-sm font-semibold text-fg">{t('forecast.subtitle', { month, day: f.DAYS_ELAPSED, days: f.DAYS_IN_MONTH })}</p>
        )}
      </div>
      {f && !isEmpty && !cardLocked && (
        <span className="inline-flex items-center min-h-8 px-3 rounded-pill bg-inner text-sm font-bold text-fg">
          {t(`forecast.confidence.${f.CONFIDENCE}`)}
        </span>
      )}
    </div>
  );

  if (cardLocked) {
    return (
      <Card index={index} className={className}>
        {header}
        <p className="mt-3 text-sm font-semibold text-fg">{t('forecast.locked.all')}</p>
        <div className="mt-gap"><PremiumPanel /></div>
      </Card>
    );
  }

  if (isEmpty) {
    return (
      <Card index={index} className={className}>
        {header}
        <p className="mt-3 font-bold text-fg">{t('forecast.empty.title')}</p>
        <p className="mt-1 text-sm font-semibold text-fg">{t('forecast.empty.desc')}</p>
        <div className="mt-gap flex flex-wrap gap-3">
          <button type="button" onClick={addExpense} className="btn-motion btn-lift inline-flex items-center min-h-11 px-5 rounded-pill bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold">
            {t('dashboard.addTransaction')}
          </button>
          <Link to="/recurring" className="btn-motion inline-flex items-center min-h-11 px-5 rounded-pill border-2 border-line text-sm font-bold text-fg hover:border-inner-2">
            {t('forecast.empty.recurring')}
          </Link>
        </div>
      </Card>
    );
  }

  if (loading || !f) {
    return (
      <Card index={index} className={className}>
        {header}
        <div className="mt-gap space-y-3"><Skeleton variant="heading" /><Skeleton /><Skeleton /><Skeleton /></div>
      </Card>
    );
  }

  const positive = f.PROJECTED_NET >= 0;
  const prevMonth = formatMonthName(dateFromYMD(f.PREV_MONTH_START), i18n.language);
  const breakEvenOpen = f.BREAK_EVEN_DAILY !== null && f.BREAK_EVEN_DAILY > 0;

  return (
    <Card index={index} className={className}>
      {header}

      {/* Verdict */}
      <div className="mt-gap">
        <p className="text-sm font-bold text-fg">{t(positive ? 'forecast.verdict.keep' : 'forecast.verdict.short', { month })}</p>
        <p className={`text-h1 font-extrabold tabular-nums ${positive ? 'text-brand-text' : 'text-fg'}`}>
          {positive ? signed(f.PROJECTED_NET, format) : minus(f.SHORTFALL_AT_MONTH_END, format)}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {positive && f.KEEP_RATE !== null && (
            <span className="inline-flex items-center min-h-8 px-3 rounded-pill bg-inner text-sm font-bold text-fg tabular-nums">
              {t('forecast.keepRate', { pct: percent.format(f.KEEP_RATE) })}
            </span>
          )}
          {f.VS_PREV_MONTH !== null && (
            <span className={`inline-flex items-center min-h-8 px-3 rounded-pill bg-inner text-sm font-bold tabular-nums ${f.VS_PREV_MONTH >= 0 ? 'text-brand-text' : 'text-fg'}`}>
              {t('forecast.vsPrev', { amount: signed(f.VS_PREV_MONTH, format), month: prevMonth })}
            </span>
          )}
        </div>
        {f.PESSIMISTIC_NET !== f.OPTIMISTIC_NET && (
          <p className="mt-2 text-sm font-semibold text-fg tabular-nums">
            {t('forecast.range', { low: signed(f.PESSIMISTIC_NET, format), high: signed(f.OPTIMISTIC_NET, format) })}
          </p>
        )}
        {f.IS_EARLY_MONTH && (
          <p className="mt-2 text-sm font-bold text-warning">{t('forecast.earlyNote', { count: f.DAYS_ELAPSED })}</p>
        )}
      </div>

      {/* The month as a line */}
      <div className="mt-gap">
        <ForecastChart f={f} format={format} monthLabel={month} />
      </div>

      {/* Nothing to base everyday spending on yet: say so, do not pretend */}
      {!f.HAS_EVERYDAY_DATA && (
        <div className="mt-gap tile-inner p-gap">
          <p className="font-bold text-fg">{t('forecast.noEveryday.title')}</p>
          <p className="mt-1 text-sm font-semibold text-fg">{t('forecast.noEveryday.desc')}</p>
          <button type="button" onClick={addExpense} className="mt-1 inline-flex items-center min-h-11 text-sm font-bold text-brand-text underline-offset-4 hover:underline">
            {t('forecast.noEveryday.cta')}
          </button>
        </div>
      )}

      {detailLocked ? (
        <div className="mt-gap"><PremiumPanel /></div>
      ) : (
        <>
          {/* Where the month's money goes */}
          <div className="mt-gap">
            <h3 className="font-bold text-fg">{t('forecast.map.title', { income: format(f.PROJECTED_INCOME) })}</h3>
            <StackedBar
              className="mt-2"
              ariaLabel={t('forecast.map.title', { income: format(f.PROJECTED_INCOME) })}
              segments={[
                { key: 'spent', label: t('forecast.map.spent'), value: f.ACTUAL_EXPENSE, color: MAP_COLORS.spent, display: format(f.ACTUAL_EXPENSE) },
                { key: 'scheduled', label: t('forecast.map.scheduled'), value: f.SCHEDULED_EXPENSE, color: MAP_COLORS.scheduled, display: format(f.SCHEDULED_EXPENSE) },
                { key: 'everyday', label: t('forecast.map.everyday'), value: f.DISCRETIONARY_REMAINING, color: MAP_COLORS.everyday, display: format(f.DISCRETIONARY_REMAINING) },
                { key: 'left', label: t('forecast.map.left'), value: f.LEFT_AT_MONTH_END, color: MAP_COLORS.left, display: format(f.LEFT_AT_MONTH_END) },
              ]}
            />
            {f.SHORTFALL_AT_MONTH_END > 0 && (
              <p className="mt-2 text-sm font-bold text-warning">{t('forecast.map.shortfall', { amount: format(f.SHORTFALL_AT_MONTH_END) })}</p>
            )}
          </div>

          {/* Safe to spend, then the three parts of the forecast */}
          <div className="mt-gap grid sm:grid-cols-2 gap-3">
            <StatBox title={t('forecast.safe.title')} value={breakEvenOpen ? format(f.BREAK_EVEN_DAILY) : undefined} tone="text-brand-text">
              <p className={`mt-0.5 text-sm ${breakEvenOpen || f.BREAK_EVEN_DAILY === null ? 'font-semibold text-fg' : 'font-bold text-warning'}`}>
                {f.BREAK_EVEN_DAILY === null
                  ? t('forecast.safe.lastDay')
                  : breakEvenOpen
                    ? t('forecast.safe.note', { days: f.DAYS_REMAINING })
                    : t('forecast.safe.none')}
              </p>
            </StatBox>
            <StatBox title={t('forecast.actual.title')}>
              <p className="mt-1 text-sm font-semibold text-fg tabular-nums">
                {t('forecast.actual.values', { income: signed(f.ACTUAL_INCOME, format), expense: minus(f.ACTUAL_EXPENSE, format) })}
              </p>
            </StatBox>
            <StatBox title={t('forecast.everyday.title')} value={minus(f.DISCRETIONARY_REMAINING, format)}>
              <p className="mt-0.5 text-sm font-semibold text-fg">
                {f.HISTORY_MONTHS > 0
                  ? t('forecast.everyday.explain', { rate: format(f.BLENDED_RATE), days: f.DAYS_REMAINING, count: f.HISTORY_MONTHS })
                  : t('forecast.everyday.explainNoHistory', { rate: format(f.BLENDED_RATE), days: f.DAYS_REMAINING })}
              </p>
            </StatBox>
            <StatBox title={t('forecast.scheduled.title')}>
              {f.SCHEDULED_COUNT === 0 ? (
                <p className="mt-1 text-sm font-semibold text-fg">{t('forecast.scheduled.none')}</p>
              ) : (
                <>
                  <p className="mt-1 text-sm font-semibold text-fg tabular-nums">
                    {t('forecast.scheduled.summary', {
                      count: f.SCHEDULED_COUNT,
                      amounts: [
                        f.SCHEDULED_INCOME > 0 && t('forecast.scheduled.income', { amount: signed(f.SCHEDULED_INCOME, format) }),
                        f.SCHEDULED_EXPENSE > 0 && t('forecast.scheduled.expense', { amount: minus(f.SCHEDULED_EXPENSE, format) }),
                      ].filter(Boolean).join(' · '),
                    })}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowScheduled((v) => !v)}
                    aria-expanded={showScheduled}
                    className="inline-flex items-center gap-1.5 min-h-11 text-sm font-bold text-brand-text"
                  >
                    {t(showScheduled ? 'forecast.scheduled.hide' : 'forecast.scheduled.show')}
                    <ChevronDown className={`plus-spin w-4 h-4 ${showScheduled ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                </>
              )}
            </StatBox>
          </div>

          {showScheduled && f.SCHEDULED_COUNT > 0 && (
            <ul className="mt-3 tile-inner p-gap flex flex-col gap-2 list-none m-0">
              {f.SCHEDULED.map((item) => (
                <li key={`${item.source}-${item.id}-${item.date}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0">
                    <span className="font-bold text-fg">{item.title || categoryName(item.categoryId)}</span>
                    <span className="block font-semibold text-fg">
                      {formatShortDay(dateFromYMD(item.date), i18n.language)}
                      {item.due && ` · ${t('forecast.scheduled.due')}`}
                    </span>
                  </span>
                  <span className={`font-extrabold tabular-nums whitespace-nowrap ${item.type === 'income' ? 'text-brand-text' : 'text-fg'}`}>
                    {item.type === 'income' ? signed(item.amount, format) : minus(item.amount, format)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* Budgets at month end */}
          {f.BUDGETED_CATEGORIES.length > 0 && (
            <div className="mt-gap">
              <h3 className="font-bold text-fg">{t('forecast.categories.title')}</h3>
              <ul className="mt-2 flex flex-col gap-3 list-none m-0 p-0">
                {f.BUDGETED_CATEGORIES.map((c) => (
                  <li key={c.categoryId ?? 'uncategorized'}>
                    <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                      <span className="min-w-0 font-bold text-fg [overflow-wrap:anywhere]">{categoryName(c.categoryId)}</span>
                      <span className="tabular-nums">
                        <span className="font-semibold text-fg">{format(c.PROJECTED_EXPENSE)} / {format(c.BUDGET)}</span>
                        <span className={`ml-2 font-bold ${c.PROJECTED_OVERSPEND > 0 ? 'text-warning' : 'text-brand-text'}`}>
                          {c.PROJECTED_OVERSPEND > 0
                            ? t('forecast.categories.over', { amount: format(c.PROJECTED_OVERSPEND) })
                            : t('forecast.categories.within')}
                        </span>
                      </span>
                    </div>
                    <ProgressBar ratio={c.PROJECTED_SHARE_OF_BUDGET} className="mt-1.5" label={categoryName(c.categoryId)} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <p className="mt-gap text-sm font-semibold text-fg">{t('forecast.indicative')}</p>
    </Card>
  );
}
