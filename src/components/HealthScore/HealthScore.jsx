import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchHealthScore, fetchHealthScoreHistory } from '../../utils/api';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { getDateLocale } from '../../utils/date';
import Card from '../UI/Card';
import Skeleton, { SkeletonGroup } from '../UI/Skeleton';

/**
 * variant="full"    gauge + pillar bars + upsell + explainer + insights + stats
 * variant="details" everything except the gauge and bars (the dashboard shows
 *                   those in its Health tile and passes the same `data`).
 * data: optional preloaded { score, history } so the dashboard fetches once.
 */
export default function HealthScore({ onReloadTrigger, compact = false, variant = 'full', data: preloaded, index }) {
  const { t, i18n } = useTranslation();
  const dateLocale = getDateLocale(i18n.language);
  const { format: fmt } = useDisplayCurrency();
  const { isPremium, isTrialing } = useSubscription();
  const isPaid = isPremium || isTrialing;
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);

  const own = useAsyncData(
    async () => {
      if (preloaded !== undefined) return null;
      const [scoreData, historyData] = await Promise.all([
        fetchHealthScore({ month: selectedMonth, forceRecalculate: true }),
        compact ? Promise.resolve([]) : fetchHealthScoreHistory(6)
      ]);
      return { score: scoreData, history: historyData || [] };
    },
    [selectedMonth, onReloadTrigger, preloaded === undefined]
  );
  const data = preloaded !== undefined ? preloaded : own.data;
  const loading = preloaded !== undefined ? preloaded === null : own.loading;
  const error = preloaded !== undefined ? null : own.error;
  const score = data?.score ?? null;

  const getScoreColor = (value) => {
    if (value >= 80) return { stroke: 'text-brand-500 dark:text-brand-400', text: 'text-brand-600 dark:text-brand-400', label: 'text-brand-600 dark:text-brand-400' };
    if (value >= 60) return { stroke: 'text-data-blue', text: 'text-data-blue-deep', label: 'text-data-blue-deep' };
    if (value >= 40) return { stroke: 'text-warning', text: 'text-warning', label: 'text-warning' };
    return { stroke: 'text-expense', text: 'text-expense', label: 'text-expense' };
  };

  const getScoreLabel = (value) => {
    if (value >= 80) return t('healthScore.excellent');
    if (value >= 60) return t('healthScore.good');
    if (value >= 40) return t('healthScore.needsWork');
    return t('healthScore.poor');
  };

  const getInsightText = (insight) => {
    switch (insight.type) {
      case 'income_expense':
        if (insight.status === 'positive') return t('healthScore.insightSavingsPositive', { amount: fmt(insight.savings), percent: insight.savingsPercent });
        if (insight.status === 'negative') return t('healthScore.insightOverspent', { amount: fmt(insight.overspent) });
        if (insight.status === 'no_income') return t('healthScore.insightNoIncome');
        return t('healthScore.insightNoData');
      case 'budget':
        if (insight.status === 'all_good') return t('healthScore.insightBudgetGood', { count: insight.totalCategories });
        if (insight.status === 'one_over') return t('healthScore.insightBudgetOneOver');
        if (insight.status === 'multiple_over') return t('healthScore.insightBudgetMultipleOver', { count: insight.categoriesOver });
        return t('healthScore.insightBudgetNoData');
      case 'savings':
        if (insight.status === 'saving') return t('healthScore.insightSaving', { amount: fmt(insight.amount) });
        if (insight.status === 'overspending') return t('healthScore.insightLosing', { amount: fmt(insight.amount) });
        return t('healthScore.insightBreakEven');
      default:
        return '';
    }
  };

  const getInsightIcon = (type) => {
    const cls = 'w-5 h-5 flex-shrink-0';
    if (type === 'income_expense') return (
      <svg className={`${cls} text-data-blue`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    if (type === 'budget') return (
      <svg className={`${cls} text-data-violet`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    );
    if (type === 'savings') return (
      <svg className={`${cls} text-brand-text`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    return (
      <svg className={`${cls} text-fg`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <Card index={index} className="min-h-[240px] space-y-4">
        <Skeleton variant="heading" className="!w-1/3" />
        <SkeletonGroup rows={3} />
      </Card>
    );
  }

  if (error || !score) {
    return (
      <Card index={index} className="text-center">
        <div className="py-4">
          <div className="w-12 h-12 rounded-icon bg-inner text-brand-text flex items-center justify-center mx-auto mb-3">
            <svg className="w-[22px] h-[22px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <p className="text-base font-extrabold text-fg mb-1">{t('healthScore.noData')}</p>
          <p className="text-sm font-semibold text-fg">{t('healthScore.noDataDesc')}</p>
        </div>
      </Card>
    );
  }

  const scoreColors = getScoreColor(score.totalScore);
  // monthDate is 'YYYY-MM-DD'; parsed as UTC parts so a timezone behind UTC
  // cannot roll it back into the previous month.
  const scoreMonthLabel = (() => {
    const raw = score.monthDate;
    if (!raw) return null;
    const [y, m] = String(raw).split('-').map(Number);
    if (!y || !m) return null;
    const label = new Date(y, m - 1, 1).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' });
    // Albanian (and most non-English locales) lowercase month names: "gusht 2026".
    // Uppercase the first letter so the label reads as a proper noun in both
    // languages. locale-aware so 'i' maps correctly outside en/sq too.
    return label.charAt(0).toLocaleUpperCase(dateLocale) + label.slice(1);
  })();
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const displayScore = Math.min(score.totalScore, 100);
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  /* ── Compact variant ── */
  if (compact) {
    const r = 42;
    const circ = 2 * Math.PI * r;
    const offset = circ - (displayScore / 100) * circ;
    return (
      <Card>
        <div className="flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" style={{ stroke: 'var(--inner-2)' }} />
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="9" strokeLinecap="round" className={`ring-arc ${scoreColors.stroke}`} style={{ strokeDasharray: circ, strokeDashoffset: offset }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-extrabold tabular-nums ${scoreColors.text}`}>{Math.round(score.totalScore)}</span>
            </div>
          </div>
          <div>
            <p className={`text-h3 font-extrabold ${scoreColors.text}`}>{getScoreLabel(score.totalScore)}</p>
            <p className="text-sm font-bold text-fg">{t('healthScore.title')}</p>
            {scoreMonthLabel && (
              <p className="text-sm font-semibold text-fg mt-0.5">{scoreMonthLabel}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  /* ── Score bar helper ── */
  const barColors = ['bg-data-violet', 'bg-data-blue', 'bg-warning', 'bg-brand-600 dark:bg-brand-400'];
  const scoreValues = [
    { label: t('healthScore.budgetAdherence'), value: score.budgetAdherenceScore, color: barColors[0] },
    { label: t('healthScore.incomeRatio'),      value: score.incomeExpenseRatioScore, color: barColors[1] },
    { label: t('healthScore.consistency'),      value: score.spendingVolatilityScore, color: barColors[2] },
    { label: t('healthScore.savings'),          value: score.savingsConsistencyScore, color: barColors[3] },
  ];

  /* ── Full variant ── */
  return (
    <Card index={index}>
      <div>

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-h3 font-bold text-fg">
              {variant === 'details' ? t('healthScore.insights') : t('healthScore.title')}
            </h2>
            {/* Name the month the score is for. The headline figures (income,
                expenses, ratio) are current-month only, so an undated score
                reads as an all-time verdict on the user's finances. */}
            <p className="text-sm font-semibold text-fg mt-0.5">
              {scoreMonthLabel
                ? t('healthScore.descriptionForMonth', { month: scoreMonthLabel })
                : t('healthScore.description')}
            </p>
          </div>
        </div>

        {/* Score + bars (the dashboard's Health tile shows these instead) */}
        {variant !== 'details' && (
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Circular gauge */}
          <div className="relative flex-shrink-0">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="54" fill="none" strokeWidth="12" style={{ stroke: 'var(--inner-2)' }} />
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="12" strokeLinecap="round" className={`ring-arc animate-draw ${scoreColors.stroke}`}
                style={{ strokeDasharray: circumference, strokeDashoffset, '--len': circumference }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-[33px] font-extrabold tabular-nums tracking-[-0.02em] leading-none ${scoreColors.text}`}>
                {Math.round(score.totalScore)}
              </span>
              <span className={`text-sm font-bold mt-1.5 ${scoreColors.label}`}>
                {getScoreLabel(score.totalScore)}
              </span>
            </div>
          </div>

          {/* Score breakdown bars */}
          <div className="flex-1 w-full space-y-3.5">
            {scoreValues.map(({ label, value, color }, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-40 text-sm font-semibold shrink-0 text-fg">{label}</span>
                <div className="flex-1 h-2.5 bg-inner-2 rounded-pill overflow-hidden">
                  {isPaid
                    ? <div className={`h-full ${color} rounded-pill bar-w origin-left animate-grow-x`} style={{ width: `${Math.min(value, 100)}%` }} />
                    : <div className="h-full bg-line rounded-pill" style={{ width: `${[65,40,75,55][i]}%` }} />
                  }
                </div>
                {isPaid
                  ? <span className="w-8 text-sm font-extrabold text-fg tabular-nums text-right">{Math.round(value)}</span>
                  : <svg className="w-4 h-4 text-fg" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 1 0-9 0v3.5M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18v-6A1.5 1.5 0 0 1 6 10.5Z" />
                    </svg>
                }
              </div>
            ))}
          </div>
        </div>
        )}

        {/* Premium upsell */}
        {!isPaid && (
          <div className="mt-6">
            <Link to="/pricing" className="tile-inner flex items-center justify-between gap-3 p-gap btn-motion hover:bg-inner-2 group">
              <div className="flex items-center gap-3">
                <span className="w-12 h-12 shrink-0 rounded-icon bg-brand-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div>
                  <p className="text-base font-extrabold text-fg">{t('healthScore.unlockFull')}</p>
                  <p className="text-sm font-semibold text-fg">{t('healthScore.unlockFullDesc')}</p>
                </div>
              </div>
              <svg className="arrow-nudge w-5 h-5 shrink-0 text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.2} aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* How it works toggle */}
        <div className="mt-5">
          <button type="button" onClick={() => setShowExplainer(p => !p)} aria-expanded={showExplainer}
            className="btn-motion inline-flex items-center gap-1.5 min-h-11 px-3 -ml-3 rounded-pill text-sm font-bold text-fg hover:bg-inner">
            <svg className="w-4 h-4 text-brand-text" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            {showExplainer ? t('healthScore.howItWorksHide') : t('healthScore.howItWorks')}
            <svg className={`plus-spin w-4 h-4 ${showExplainer ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExplainer && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { rail: 'border-l-data-violet', label: t('healthScore.budgetAdherence'), weight: 40, desc: t('healthScore.pillarBudgetDesc') },
                { rail: 'border-l-data-blue',   label: t('healthScore.incomeRatio'),      weight: 30, desc: t('healthScore.pillarRatioDesc') },
                { rail: 'border-l-warning',     label: t('healthScore.consistency'),      weight: 20, desc: t('healthScore.pillarStabilityDesc') },
                { rail: 'border-l-brand-600',   label: t('healthScore.savings'),          weight: 10, desc: t('healthScore.pillarSavingsDesc') },
              ].map(({ label, weight, desc }) => (
                <div key={label} className="tile-inner p-gap animate-rise">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-base font-extrabold text-fg">{label}</span>
                    <span className="text-sm font-bold text-fg tabular-nums whitespace-nowrap">{t('healthScore.pillarWeight', { weight })}</span>
                  </div>
                  <p className="text-sm font-semibold text-fg">{desc}</p>
                </div>
              ))}
              <p className="col-span-full text-sm font-semibold text-fg text-center">{t('healthScore.howItWorksSummary')}</p>
            </div>
          )}
        </div>

        {/* Insights */}
        {score.insights?.length > 0 && isPaid && (
          <div className="mt-5 pt-5 border-t border-line">
            {variant !== 'details' && <h3 className="text-base font-extrabold text-fg mb-3">{t('healthScore.insights')}</h3>}
            <ul className="space-y-2.5">
              {score.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                  <p className="text-base text-fg">{getInsightText(insight)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick stats — current month only, unlike the volatility and savings
            pillars above which look back 7 months. Labelled so the two are not
            read as the same period. */}
        {isPaid && (
          <div className="mt-5 pt-5 border-t border-line">
            {scoreMonthLabel && (
              <h3 className="text-base font-extrabold text-fg mb-3">
                {scoreMonthLabel}
              </h3>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="tile-inner px-[18px] py-[14px]">
                <p className="text-sm font-bold text-fg mb-1">{t('healthScore.income')}</p>
                <p className="text-h3 font-extrabold tabular-nums text-brand-text">
                  {fmt(score.totalIncome)}
                </p>
              </div>
              <div className="tile-inner px-[18px] py-[14px]">
                <p className="text-sm font-bold text-fg mb-1">{t('healthScore.expenses')}</p>
                <p className="text-h3 font-extrabold tabular-nums text-fg">
                  {fmt(score.totalExpenses)}
                </p>
              </div>
              <div className="tile-inner px-[18px] py-[14px]">
                <p className="text-sm font-bold text-fg mb-1">{t('healthScore.saved')}</p>
                <p className={`text-h3 font-extrabold tabular-nums ${score.savingsAmount >= 0 ? 'text-brand-text' : 'text-fg'}`}>
                  {fmt(score.savingsAmount)}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
}
