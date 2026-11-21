import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ChevronDown, Lock } from 'lucide-react';
import Card from '../UI/Card';
import Skeleton from '../UI/Skeleton';
import { useMonthForecast } from '../../hooks/useMonthForecast';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useSubscription } from '../../context/SubscriptionContext';
import { useTransactions } from '../../context/TransactionContext';
import { FORECAST_PREMIUM_SCOPE } from '../../utils/finance/forecast/forecastConfig';
import { UNCATEGORIZED } from '../../utils/finance/forecast/forecastEngine';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatMonthName, formatShortDay } from '../../utils/date';
import { parseYMD } from '../../utils/finance/calendar';
import { MINUS } from '../../utils/bento';

/**
 * "End-of-month forecast" (replaces the old 30/60/90-day cash flow card).
 * Every number shown comes from useMonthForecast -> forecastEngine; this
 * component only formats and lays them out. Premium gating follows
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

function LockedSection({ title, reason }) {
  const { t } = useTranslation();
  return (
    <div className="tile-inner p-gap">
      <p className="flex items-center gap-2 font-bold text-fg">
        <Lock className="w-4 h-4 shrink-0 text-brand-text" strokeWidth={2.4} aria-hidden="true" />
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold text-fg">{reason}</p>
      <Link to="/pricing" className="mt-2 inline-flex items-center min-h-11 text-sm font-bold text-brand-text underline-offset-4 hover:underline">
        {t('forecast.locked.cta')}
      </Link>
    </div>
  );
}

function Row({ title, value, children }) {
  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-baseline justify-between gap-3">
        <p className="font-bold text-fg">{title}</p>
        {value !== undefined && <p className="font-extrabold text-fg tabular-nums whitespace-nowrap">{value}</p>}
      </div>
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
  const categoryName = (id) => {
    if (id === UNCATEGORIZED) return t('forecast.uncategorized');
    return translateCategoryName(categories.find((c) => c.id === id)?.name || '');
  };

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
        <div className="mt-gap"><LockedSection title={t('forecast.title')} reason={t('forecast.locked.all')} /></div>
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
          <button
            type="button"
            onClick={() => window.dispatchEvent(new CustomEvent('openAddTransaction'))}
            className="btn-motion btn-lift inline-flex items-center min-h-11 px-5 rounded-pill bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold"
          >
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

  return (
    <Card index={index} className={className}>
      {header}

      {/* Headline: projected net and its range */}
      <div className="mt-gap">
        <p className="text-sm font-bold text-fg">{t('forecast.headline', { month })}</p>
        <p className={`text-h1 font-extrabold tabular-nums ${f.PROJECTED_NET >= 0 ? 'text-brand-text' : 'text-fg'}`}>
          {signed(f.PROJECTED_NET, format)}
        </p>
        <p className="mt-1 text-sm font-semibold text-fg tabular-nums">
          {t('forecast.range', { low: signed(f.PESSIMISTIC_NET, format), high: signed(f.OPTIMISTIC_NET, format) })}
        </p>
        {f.IS_EARLY_MONTH && (
          <p className="mt-2 text-sm font-bold text-warning">{t('forecast.earlyNote', { count: f.DAYS_ELAPSED })}</p>
        )}
      </div>

      {/* Breakdown */}
      <div className="mt-gap">
        {detailLocked ? (
          <LockedSection title={t('forecast.breakdownTitle')} reason={t('forecast.locked.breakdown')} />
        ) : (
          <div className="tile-inner p-gap divide-y divide-line">
            <Row title={t('forecast.actual.title')}>
              <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
                {t('forecast.actual.values', { income: signed(f.ACTUAL_INCOME, format), expense: minus(f.ACTUAL_EXPENSE, format) })}
              </p>
            </Row>

            <Row title={t('forecast.scheduled.title')}>
              {f.SCHEDULED_COUNT === 0 ? (
                <p className="mt-0.5 text-sm font-semibold text-fg">{t('forecast.scheduled.none')}</p>
              ) : (
                <>
                  <p className="mt-0.5 text-sm font-semibold text-fg tabular-nums">
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
                    className="mt-1 inline-flex items-center gap-1.5 min-h-11 text-sm font-bold text-brand-text"
                  >
                    {t(showScheduled ? 'forecast.scheduled.hide' : 'forecast.scheduled.show')}
                    <ChevronDown className={`plus-spin w-4 h-4 ${showScheduled ? 'rotate-180' : ''}`} strokeWidth={2.4} aria-hidden="true" />
                  </button>
                  {showScheduled && (
                    <ul className="mt-1 flex flex-col gap-2 list-none m-0 p-0">
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
                </>
              )}
            </Row>

            <Row title={t('forecast.everyday.title')} value={minus(f.DISCRETIONARY_REMAINING, format)}>
              <p className="mt-0.5 text-sm font-semibold text-fg">
                {f.HISTORY_MONTHS > 0
                  ? t('forecast.everyday.explain', { rate: format(f.BLENDED_RATE), days: f.DAYS_REMAINING, count: f.HISTORY_MONTHS })
                  : t('forecast.everyday.explainNoHistory', { rate: format(f.BLENDED_RATE), days: f.DAYS_REMAINING })}
              </p>
            </Row>
          </div>
        )}
      </div>

      {/* Budgets by month end: only categories with a budget */}
      {f.BUDGETED_CATEGORIES.length > 0 && (
        <div className="mt-gap">
          {detailLocked ? (
            <LockedSection title={t('forecast.categories.title')} reason={t('forecast.locked.categories')} />
          ) : (
            <>
              <h3 className="font-bold text-fg">{t('forecast.categories.title')}</h3>
              <ul className="mt-2 flex flex-col gap-2 list-none m-0 p-0">
                {f.BUDGETED_CATEGORIES.map((c) => (
                  <li key={c.categoryId ?? 'uncategorized'} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="min-w-0 font-bold text-fg [overflow-wrap:anywhere]">{categoryName(c.categoryId)}</span>
                    <span className="text-right tabular-nums whitespace-nowrap">
                      <span className="font-semibold text-fg">{format(c.PROJECTED_EXPENSE)} / {format(c.BUDGET)}</span>
                      <span className={`block font-bold ${c.PROJECTED_OVERSPEND > 0 ? 'text-warning' : 'text-brand-text'}`}>
                        {c.PROJECTED_OVERSPEND > 0
                          ? t('forecast.categories.over', { amount: format(c.PROJECTED_OVERSPEND) })
                          : t('forecast.categories.within')}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <p className="mt-gap text-sm font-semibold text-fg">{t('forecast.indicative')}</p>
    </Card>
  );
}
