import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchHealthScore, fetchHealthScoreHistory } from '../../utils/api';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import Card from '../UI/Card';

export default function HealthScore({ onReloadTrigger, compact = false }) {
  const { t } = useTranslation();
  const { isPremium, isTrialing } = useSubscription();
  const isPaid = isPremium || isTrialing;
  const [selectedMonth, setSelectedMonth] = useState(null);
  const [showExplainer, setShowExplainer] = useState(false);

  const { data, loading, error } = useAsyncData(
    async () => {
      const [scoreData, historyData] = await Promise.all([
        fetchHealthScore({ month: selectedMonth, forceRecalculate: true }),
        compact ? Promise.resolve([]) : fetchHealthScoreHistory(6)
      ]);
      return { score: scoreData, history: historyData || [] };
    },
    [selectedMonth, onReloadTrigger]
  );
  const score = data?.score ?? null;

  const getScoreColor = (value) => {
    if (value >= 80) return { stroke: 'text-brand-500 dark:text-brand-400', text: 'text-brand-600 dark:text-brand-400', label: 'text-brand-600 dark:text-brand-400' };
    if (value >= 60) return { stroke: 'text-[#6A8FC4]', text: 'text-[#5B8DB8]', label: 'text-[#5B8DB8]' };
    if (value >= 40) return { stroke: 'text-amber-500', text: 'text-amber-600 dark:text-amber-400', label: 'text-amber-600 dark:text-amber-400' };
    return { stroke: 'text-[#e8394d]', text: 'text-[#e8394d]', label: 'text-[#e8394d]' };
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
        if (insight.status === 'positive') return t('healthScore.insightSavingsPositive', { amount: insight.savings.toFixed(2), percent: insight.savingsPercent });
        if (insight.status === 'negative') return t('healthScore.insightOverspent', { amount: insight.overspent.toFixed(2) });
        if (insight.status === 'no_income') return t('healthScore.insightNoIncome');
        return t('healthScore.insightNoData');
      case 'budget':
        if (insight.status === 'all_good') return t('healthScore.insightBudgetGood', { count: insight.totalCategories });
        if (insight.status === 'one_over') return t('healthScore.insightBudgetOneOver');
        if (insight.status === 'multiple_over') return t('healthScore.insightBudgetMultipleOver', { count: insight.categoriesOver });
        return t('healthScore.insightBudgetNoData');
      case 'savings':
        if (insight.status === 'saving') return t('healthScore.insightSaving', { amount: insight.amount.toFixed(2) });
        if (insight.status === 'overspending') return t('healthScore.insightLosing', { amount: insight.amount.toFixed(2) });
        return t('healthScore.insightBreakEven');
      default:
        return '';
    }
  };

  const getInsightIcon = (type) => {
    const cls = 'w-4 h-4 flex-shrink-0';
    if (type === 'income_expense') return (
      <svg className={`${cls} text-[#6A8FC4]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    if (type === 'budget') return (
      <svg className={`${cls} text-[#9B7EB3]`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    );
    if (type === 'savings') return (
      <svg className={`${cls} text-brand-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    );
    return (
      <svg className={`${cls} text-ink-muted dark:text-white`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
      </svg>
    );
  };

  if (loading) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-5 bg-surface-hairline dark:bg-surface-dark-hairline rounded w-1/3" />
          <div className="flex justify-center">
            <div className="w-32 h-32 rounded-full bg-surface-hairline dark:bg-surface-dark-hairline" />
          </div>
          <div className="space-y-2">
            {[1,2,3].map(i => <div key={i} className="h-4 bg-surface-hairline dark:bg-surface-dark-hairline rounded" />)}
          </div>
        </div>
      </Card>
    );
  }

  if (error || !score) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-surface-page dark:bg-surface-dark-page flex items-center justify-center mx-auto mb-3">
            <svg className="w-5 h-5 text-ink-muted dark:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
            </svg>
          </div>
          <p className="text-sm font-medium text-ink-primary dark:text-white mb-1">{t('healthScore.noData')}</p>
          <p className="text-xs text-ink-muted dark:text-white">{t('healthScore.noDataDesc')}</p>
        </div>
      </Card>
    );
  }

  const scoreColors = getScoreColor(score.totalScore);
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
        <div className="p-4 sm:p-6 flex items-center gap-5">
          <div className="relative flex-shrink-0">
            <svg className="w-16 h-16 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" className="text-surface-hairline dark:text-surface-dark-hairline" />
              <circle cx="50" cy="50" r={r} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className={scoreColors.stroke} style={{ strokeDasharray: circ, strokeDashoffset: offset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold tabular-nums ${scoreColors.text}`}>{Math.round(score.totalScore)}</span>
            </div>
          </div>
          <div>
            <p className={`text-xl font-semibold tracking-tight ${scoreColors.text}`}>{getScoreLabel(score.totalScore)}</p>
            <p className="text-sm text-ink-muted dark:text-white">{t('healthScore.title')}</p>
          </div>
        </div>
      </Card>
    );
  }

  /* ── Score bar helper ── */
  const barColors = ['bg-[#9B7EB3]', 'bg-[#6A8FC4]', 'bg-amber-400', 'bg-brand-500'];
  const scoreValues = [
    { label: t('healthScore.budgetAdherence'), value: score.budgetAdherenceScore, color: barColors[0] },
    { label: t('healthScore.incomeRatio'),      value: score.incomeExpenseRatioScore, color: barColors[1] },
    { label: t('healthScore.consistency'),      value: score.spendingVolatilityScore, color: barColors[2] },
    { label: t('healthScore.savings'),          value: score.savingsConsistencyScore, color: barColors[3] },
  ];

  /* ── Full variant ── */
  return (
    <Card className="mt-4 sm:mt-6">
      <div className="p-5 sm:p-7">

        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-lg font-semibold text-ink-primary dark:text-white tracking-tight">
              {t('healthScore.title')}
            </h2>
            <p className="text-sm text-ink-muted dark:text-white mt-0.5">
              {t('healthScore.description')}
            </p>
          </div>
        </div>

        {/* Score + bars */}
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Circular gauge */}
          <div className="relative flex-shrink-0">
            <svg className="w-36 h-36 -rotate-90" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" className="text-surface-hairline dark:text-surface-dark-hairline" />
              <circle cx="60" cy="60" r="54" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" className={scoreColors.stroke}
                style={{ strokeDasharray: circumference, strokeDashoffset, transition: 'stroke-dashoffset 0.6s ease-in-out' }} />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold tabular-nums tracking-tight leading-none ${scoreColors.text}`}>
                {Math.round(score.totalScore)}
              </span>
              <span className={`text-xs font-medium mt-1.5 ${scoreColors.label}`}>
                {getScoreLabel(score.totalScore)}
              </span>
            </div>
          </div>

          {/* Score breakdown bars */}
          <div className="flex-1 w-full space-y-3.5">
            {scoreValues.map(({ label, value, color }, i) => (
              <div key={label} className="flex items-center gap-3">
                <span className="w-36 text-xs shrink-0 text-ink-muted dark:text-white">{label}</span>
                <div className="flex-1 h-1.5 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
                  {isPaid
                    ? <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(value, 100)}%` }} />
                    : <div className="h-full bg-surface-hairline dark:bg-surface-dark-elevated rounded-full" style={{ width: `${[65,40,75,55][i]}%` }} />
                  }
                </div>
                {isPaid
                  ? <span className="w-8 text-xs font-semibold text-ink-primary dark:text-white tabular-nums text-right">{Math.round(value)}</span>
                  : <svg className="w-3.5 h-3.5 text-ink-muted/40 dark:text-white/40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V7a4.5 4.5 0 1 0-9 0v3.5M6 10.5h12a1.5 1.5 0 0 1 1.5 1.5v6A1.5 1.5 0 0 1 18 19.5H6A1.5 1.5 0 0 1 4.5 18v-6A1.5 1.5 0 0 1 6 10.5Z" />
                    </svg>
                }
              </div>
            ))}
          </div>
        </div>

        {/* Premium upsell */}
        {!isPaid && (
          <div className="mt-6">
            <Link to="/pricing" className="flex items-center justify-between px-4 py-3 rounded-lg bg-brand-50 dark:bg-brand-950/30 border border-brand-200/60 dark:border-brand-800/30 hover:border-brand-400 dark:hover:border-brand-600 transition-all group">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-md bg-brand-100 dark:bg-brand-950/50 flex items-center justify-center">
                  <svg className="w-4 h-4 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-primary dark:text-white">{t('healthScore.unlockFull')}</p>
                  <p className="text-xs text-ink-muted dark:text-white">{t('healthScore.unlockFullDesc')}</p>
                </div>
              </div>
              <svg className="w-4 h-4 text-ink-muted/60 group-hover:text-brand-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* How it works toggle */}
        <div className="mt-5">
          <button onClick={() => setShowExplainer(p => !p)}
            className="flex items-center gap-1.5 text-xs font-medium text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary transition-colors">
            <svg className="w-3.5 h-3.5 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
            </svg>
            {showExplainer ? t('healthScore.howItWorksHide') : t('healthScore.howItWorks')}
            <svg className={`w-3 h-3 transition-transform duration-200 ${showExplainer ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showExplainer && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { color: 'bg-[#9B7EB3]/10 border-[#9B7EB3]/30 text-[#9B7EB3]', label: t('healthScore.budgetAdherence'), weight: 40, desc: t('healthScore.pillarBudgetDesc') },
                { color: 'bg-[#6A8FC4]/10 border-[#6A8FC4]/30 text-[#6A8FC4]',   label: t('healthScore.incomeRatio'),      weight: 30, desc: t('healthScore.pillarRatioDesc') },
                { color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200/60 dark:border-amber-800/30 text-amber-600 dark:text-amber-400', label: t('healthScore.consistency'), weight: 20, desc: t('healthScore.pillarStabilityDesc') },
                { color: 'bg-brand-50 dark:bg-brand-950/20 border-brand-200/60 dark:border-brand-800/30 text-brand-600 dark:text-brand-400', label: t('healthScore.savings'),      weight: 10, desc: t('healthScore.pillarSavingsDesc') },
              ].map(({ color, label, weight, desc }) => (
                <div key={label} className={`p-3.5 rounded-lg border ${color} bg-opacity-30`}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold">{label}</span>
                    <span className="text-[10px] font-medium opacity-70">{t('healthScore.pillarWeight', { weight })}</span>
                  </div>
                  <p className="text-xs text-ink-muted dark:text-white leading-relaxed">{desc}</p>
                </div>
              ))}
              <p className="col-span-full text-[10px] text-ink-muted/70 dark:text-white/70 text-center">{t('healthScore.howItWorksSummary')}</p>
            </div>
          )}
        </div>

        {/* Insights */}
        {score.insights?.length > 0 && isPaid && (
          <div className="mt-5 pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
            <p className="eyebrow text-[10px] mb-3">{t('healthScore.insights')}</p>
            <ul className="space-y-2.5">
              {score.insights.map((insight, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <div className="mt-0.5">{getInsightIcon(insight.type)}</div>
                  <p className="text-sm text-ink-muted dark:text-white leading-relaxed">{getInsightText(insight)}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick stats */}
        {isPaid && (
          <div className="mt-5 pt-5 border-t border-surface-hairline dark:border-surface-dark-hairline">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="eyebrow text-[10px] mb-1">{t('healthScore.income')}</p>
                <p className="text-sm font-semibold tabular-nums text-brand-600 dark:text-brand-400">
                  €{score.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="eyebrow text-[10px] mb-1">{t('healthScore.expenses')}</p>
                <p className="text-sm font-semibold tabular-nums text-[#e8394d] dark:text-[#e8394d]">
                  €{score.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="eyebrow text-[10px] mb-1">{t('healthScore.saved')}</p>
                <p className={`text-sm font-semibold tabular-nums ${score.savingsAmount >= 0 ? 'text-brand-600 dark:text-brand-400' : 'text-[#e8394d] dark:text-[#e8394d]'}`}>
                  €{score.savingsAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </Card>
  );
}
