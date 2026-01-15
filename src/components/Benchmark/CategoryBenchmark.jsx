import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchCategoryBenchmarks } from '../../utils/api';
import { translateCategoryName } from '../../utils/categoryTranslation';
import Card from '../UI/Card';

export default function CategoryBenchmark({ onReloadTrigger }) {
  const { t } = useTranslation();
  const [benchmarks, setBenchmarks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [months, setMonths] = useState(1);

  useEffect(() => {
    async function loadBenchmarks() {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchCategoryBenchmarks(months);
        setBenchmarks(data);
      } catch (err) {
        console.error('Error loading benchmarks:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadBenchmarks();
  }, [months, onReloadTrigger]);

  const getStatusConfig = (status) => {
    switch (status) {
      case 'below':
        return {
          label: t('benchmark.statusBelow'),
          bgColor: 'bg-green-100 dark:bg-green-900/40',
          textColor: 'text-green-700 dark:text-green-400',
          borderColor: 'border-green-200 dark:border-green-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
            </svg>
          ),
          progressColor: 'bg-green-500'
        };
      case 'above':
        return {
          label: t('benchmark.statusAbove'),
          bgColor: 'bg-red-100 dark:bg-red-900/40',
          textColor: 'text-red-700 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          ),
          progressColor: 'bg-red-500'
        };
      case 'new':
        return {
          label: t('benchmark.statusNew'),
          bgColor: 'bg-red-100 dark:bg-red-900/40',
          textColor: 'text-red-700 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          ),
          progressColor: 'bg-red-500'
        };
      default:
        return {
          label: t('benchmark.statusWithin'),
          bgColor: 'bg-blue-100 dark:bg-blue-900/40',
          textColor: 'text-blue-700 dark:text-blue-400',
          borderColor: 'border-blue-200 dark:border-blue-700',
          icon: (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ),
          progressColor: 'bg-blue-500'
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
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
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
          <div className="text-red-500 dark:text-red-400 mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-600 dark:text-gray-400">{t('benchmark.loadError')}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4 sm:mt-6">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              {t('benchmark.title')}
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
              {t('benchmark.description')}
            </p>
          </div>
          
          {/* Period selector */}
          <div className="flex gap-2">
            <button
              onClick={() => setMonths(1)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                months === 1
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('benchmark.period1Month')}
            </button>
            <button
              onClick={() => setMonths(6)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
                months === 6
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {t('benchmark.period6Months')}
            </button>
          </div>
        </div>

        {/* Benchmarks list */}
        {benchmarks.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-gray-700 dark:text-gray-300 font-bold mb-2">{t('benchmark.noData')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">
              {t('benchmark.noDataDesc')}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benchmarks.map((benchmark) => {
              const config = getStatusConfig(benchmark.status);
              const progress = calculateProgress(
                benchmark.current_month_spending,
                benchmark.upper_threshold
              );
              
              return (
                <div
                  key={benchmark.category_id}
                  className={`rounded-xl border-2 ${config.borderColor} ${config.bgColor} p-4 transition-all hover:shadow-md`}
                >
                  {/* Category header */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-gray-800 dark:text-white">
                        {translateCategoryName(benchmark.category_name)}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('benchmark.basedOn', { months: benchmark.months_with_data })}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${config.bgColor} ${config.textColor}`}>
                      {config.icon}
                      {config.label}
                    </span>
                  </div>

                  {/* Current spending */}
                  <div className="mb-3">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900 dark:text-white">
                        €{Number(benchmark.current_month_spending).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {t('benchmark.thisMonth')}
                      </span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mb-3">
                    <div className="h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${config.progressColor} transition-all duration-500 rounded-full`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Thresholds */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                    <div>
                      <span className="block font-medium">{t('benchmark.typical')}</span>
                      <span>€{Number(benchmark.lower_threshold).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })} - €{Number(benchmark.upper_threshold).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="text-right">
                      <span className="block font-medium">{t('benchmark.average')}</span>
                      <span>€{Number(benchmark.avg_monthly_spending).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}/{t('benchmark.month')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Legend */}
        {benchmarks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
              {t('benchmark.legendInfo')}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}
