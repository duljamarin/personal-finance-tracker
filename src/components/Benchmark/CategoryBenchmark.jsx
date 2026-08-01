import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCategoryBenchmarks } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { useSubscription } from '../../context/SubscriptionContext';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import Card from '../UI/Card';

// Status -> design token color map (CSS vars; see chartColors / index.css).
// on-track -> brand accent; over -> expense; under -> data.blue.
// `new` means "no history to compare against yet" — a neutral fact, not a
// problem, so it must not borrow the expense red that signals overspending.
const STATUS_COLOR = {
  within: 'var(--c-brand-accent)',
  below: 'var(--c-data-blue)',
  above: 'var(--c-expense)',
  new: 'var(--c-brand-accent)',
};

export default function CategoryBenchmark({ onReloadTrigger }) {
  const { t } = useTranslation();
  // Benchmark figures come back EUR-normalized from the RPC.
  const { format: formatCurrency } = useDisplayCurrency();
  const { isPremium } = useSubscription();
  const [months, setMonths] = useState(1);

  // Free users are always locked to 1-month view
  const effectiveMonths = isPremium ? months : 1;

  const { data: benchmarks, loading, error } = useAsyncData(
    () => fetchCategoryBenchmarks(effectiveMonths),
    [effectiveMonths, onReloadTrigger],
    []
  );

  const getStatusConfig = (status) => {
    switch (status) {
      case 'below':
        return {
          label: t('benchmark.statusBelow'),
          // under-budget pill
          pillClass: 'bg-data-blue/10 dark:bg-data-blue/[0.18] text-data-blue',
          // card border
          borderClass: 'border-l-2 border-l-data-blue',
          // soft tinted card surface
          cardBgClass: 'bg-white dark:bg-surface-dark-card',
          progressColor: 'var(--c-data-blue)',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
        };
      case 'above':
        return {
          label: t('benchmark.statusAbove'),
          pillClass: 'bg-expense-bg dark:bg-expense-tint text-expense',
          borderClass: 'border-l-2 border-l-expense',
          cardBgClass: 'bg-white dark:bg-surface-dark-card',
          progressColor: 'var(--c-expense)',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
        };
      case 'new':
        // Neutral, not red: "no baseline yet" is a statement about how much
        // history exists, not a judgement on the spending.
        return {
          label: t('benchmark.statusNew'),
          pillClass: 'bg-surface-subtle dark:bg-surface-dark-subtle text-ink-muted dark:text-white/70',
          borderClass: 'border-l-2 border-l-surface-outline dark:border-l-surface-dark-outline',
          cardBgClass: 'bg-white dark:bg-surface-dark-card',
          progressColor: 'var(--c-brand-accent)',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
      default:
        return {
          label: t('benchmark.statusWithin'),
          pillClass: 'bg-surface-subtle dark:bg-surface-dark-subtle text-brand-600 dark:text-brand-400',
          borderClass: 'border-l-2 border-l-brand-600',
          cardBgClass: 'bg-white dark:bg-surface-dark-card',
          progressColor: 'var(--c-brand-accent)',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
        };
    }
  };

  const calculateProgress = (current, upper) => {
    if (upper === 0) return 0;
    return Math.min(100, (current / upper) * 100);
  };

  if (loading) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-surface-hairline dark:bg-surface-dark-hairline rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-surface-hairline dark:bg-surface-dark-hairline rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-6 text-center">
          <div className="text-expense dark:text-expense mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-ink-muted dark:text-white">{t('benchmark.loadError')}</p>
        </div>
      </Card>
    );
  }

  const periodButtonBase =
    'px-4 py-2 rounded-md font-medium text-sm transition-colors';
  const periodActive = 'bg-brand-600 text-white';
  const periodInactive =
    'bg-white dark:bg-surface-dark-elevated border border-surface-outline dark:border-surface-dark-outline text-ink-muted dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle';

  return (
    <Card className="mt-4 sm:mt-6">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow block mb-2">{t('benchmark.title')}</span>
            <h2 className="font-semibold tracking-tight text-xl sm:text-2xl text-ink-primary dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-brand-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('benchmark.title')}
            </h2>
            <p className="text-ink-muted dark:text-white text-sm mt-1">
              {t('benchmark.description')}
            </p>
          </div>

          {/* Period selector */}
          {isPremium ? (
            <div className="flex gap-2">
              <button
                onClick={() => setMonths(1)}
                className={`${periodButtonBase} ${months === 1 ? periodActive : periodInactive}`}
              >
                {t('benchmark.period1Month')}
              </button>
              <button
                onClick={() => setMonths(6)}
                className={`${periodButtonBase} ${months === 6 ? periodActive : periodInactive}`}
              >
                {t('benchmark.period6Months')}
              </button>
            </div>
          ) : (
            <div className="flex gap-2 items-center">
              <span className={`${periodButtonBase} ${periodActive}`}>
                {t('benchmark.period1Month')}
              </span>
              <a href="/pricing" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline">
                {t('benchmark.unlockPeriods')}
              </a>
            </div>
          )}
        </div>

        {/* Benchmarks list */}
        {(() => {
          // Rows without history used to be filtered out entirely, so a first-run
          // user saw nothing at all even though their spending had been computed.
          // They are rendered now with their real current-month spend, labelled
          // as having no baseline yet; the comparison appears next month.
          const benchmarksWithHistory = benchmarks.filter(b => b.months_with_data > 0);
          const hasAnyHistory = benchmarksWithHistory.length > 0;
          // Everything with spending to show, history or not. Sorted by spend so
          // the biggest categories lead on a first run.
          const visible = hasAnyHistory
            ? benchmarksWithHistory
            : [...benchmarks]
                .filter(b => Number(b.current_month_spending) > 0)
                .sort((a, b) => Number(b.current_month_spending) - Number(a.current_month_spending));

          if (visible.length === 0) {
            return (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-surface-subtle dark:bg-surface-dark-subtle rounded-md flex items-center justify-center mx-auto mb-4">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-ink-muted dark:text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h3 className="font-semibold tracking-tight text-ink-primary dark:text-white mb-2">
                  {t('benchmark.noData')}
                </h3>
                <p className="text-ink-muted dark:text-white text-sm max-w-sm mx-auto">
                  {t('benchmark.noDataDesc')}
                </p>
              </div>
            );
          }

          return (
            <>
              {/* First run: say plainly that the comparison is not available yet,
                  instead of a progress bar with an invented percentage. */}
              {!hasAnyHistory && (
                <div className="mb-4 rounded-container border border-surface-hairline dark:border-surface-dark-hairline border-l-2 border-l-brand-600 dark:border-l-brand-400 bg-white dark:bg-surface-dark-card p-4">
                  <p className="text-sm font-semibold text-ink-primary dark:text-white mb-1">
                    {t('benchmark.buildingBaseline')}
                  </p>
                  <p className="text-sm text-ink-muted dark:text-white/70 leading-relaxed">
                    {t('benchmark.buildingBaselineDesc')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {visible.map((benchmark) => {
                  const config = getStatusConfig(benchmark.status);
                  const progress = calculateProgress(
                    benchmark.current_month_spending,
                    benchmark.upper_threshold
                  );

                  return (
                    <div
                      key={benchmark.category_id}
                      className={`rounded-container border border-surface-hairline dark:border-surface-dark-hairline ${config.borderClass} ${config.cardBgClass} p-4 transition-colors`}
                    >
                      {/* Category header */}
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold tracking-tight text-ink-primary dark:text-white truncate">
                            {translateCategoryName(benchmark.category_name)}
                          </h3>
                          {benchmark.months_with_data > 0 && (
                            <p className="text-xs text-ink-muted dark:text-white mt-0.5">
                              {t('benchmark.basedOn', { months: benchmark.months_with_data })}
                            </p>
                          )}
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${config.pillClass}`}>
                          {config.icon}
                          {config.label}
                        </span>
                      </div>

                      {/* Current spending */}
                      <div className="mb-3">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="eyebrow">{t('benchmark.thisMonth')}</span>
                        </div>
                        <div className="flex items-baseline gap-2 mt-1">
                          <span className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">
                            {formatCurrency(Number(benchmark.current_month_spending))}
                          </span>
                        </div>
                      </div>

                      {/* No baseline yet: showing a 0 - 0 "typical range" and a
                          0/month average would be worse than saying nothing, so
                          state the situation instead. */}
                      {benchmark.months_with_data === 0 ? (
                        <p className="mt-2 text-xs text-ink-muted dark:text-white/70 leading-relaxed">
                          {t('benchmark.noBaselineYet')}
                        </p>
                      ) : isPremium ? (
                        <>
                          <div className="mb-3">
                            <div className="h-2 bg-surface-hairline dark:bg-surface-dark-hairline rounded-full overflow-hidden">
                              <div
                                className="h-full transition-all duration-500 rounded-full"
                                style={{
                                  width: `${Math.min(progress, 100)}%`,
                                  backgroundColor: config.progressColor,
                                }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-xs text-ink-muted dark:text-white gap-3">
                            <div>
                              <span className="eyebrow block mb-0.5">{t('benchmark.typical')}</span>
                              <span className="font-semibold tracking-tight text-ink-secondary dark:text-white">
                                {formatCurrency(Number(benchmark.lower_threshold), { compact: true })} - {formatCurrency(Number(benchmark.upper_threshold), { compact: true })}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="eyebrow block mb-0.5">{t('benchmark.average')}</span>
                              <span className="font-semibold tracking-tight text-ink-secondary dark:text-white">
                                {formatCurrency(Number(benchmark.avg_monthly_spending), { compact: true })}/{t('benchmark.month')}
                              </span>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="mt-2 rounded-lg border border-dashed border-surface-hairline dark:border-surface-dark-hairline bg-surface-subtle dark:bg-surface-dark-subtle px-3 py-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 text-ink-muted dark:text-white">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                            <span className="text-xs">
                              {t('benchmark.typical')} &middot; {t('benchmark.average')}
                            </span>
                          </div>
                          <a href="/pricing" className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline whitespace-nowrap">
                            {t('upgrade.upgradeCta')}
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          );
        })()}

        {/* Legend */}
        {benchmarks.some(b => b.months_with_data > 0) && (
          <div className="mt-6 pt-4 border-t border-surface-hairline dark:border-surface-dark-hairline">
            <p className="text-xs text-ink-muted dark:text-white text-center">
              {t('benchmark.legendInfo')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
