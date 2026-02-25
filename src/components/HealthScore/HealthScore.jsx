import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { fetchHealthScore, fetchHealthScoreHistory } from '../../utils/api';
import { useSubscription } from '../../context/SubscriptionContext';
import Card from '../UI/Card';

export default function HealthScore({ onReloadTrigger, compact = false }) {
  const { t } = useTranslation();
  const { isPremium } = useSubscription();
  const [score, setScore] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(null);

  useEffect(() => {
    async function loadScore() {
      try {
        setLoading(true);
        setError(null);
        
        const [scoreData, historyData] = await Promise.all([
          fetchHealthScore({ month: selectedMonth, forceRecalculate: true }),
          compact ? Promise.resolve([]) : fetchHealthScoreHistory(6)
        ]);
        
        setScore(scoreData);
        setHistory(historyData || []);
      } catch (err) {
        console.error('Error loading health score:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    loadScore();
  }, [selectedMonth, onReloadTrigger]);

  const getScoreColor = (value) => {
    if (value >= 80) return { bg: 'bg-green-500', text: 'text-green-600 dark:text-green-400', ring: 'ring-green-500' };
    if (value >= 60) return { bg: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', ring: 'ring-blue-500' };
    if (value >= 40) return { bg: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400', ring: 'ring-yellow-500' };
    return { bg: 'bg-red-500', text: 'text-red-600 dark:text-red-400', ring: 'ring-red-500' };
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
        if (insight.status === 'positive') {
          return t('healthScore.insightSavingsPositive', { 
            amount: insight.savings.toFixed(2), 
            percent: insight.savingsPercent 
          });
        } else if (insight.status === 'negative') {
          return t('healthScore.insightOverspent', { amount: insight.overspent.toFixed(2) });
        } else if (insight.status === 'no_income') {
          return t('healthScore.insightNoIncome');
        } else {
          return t('healthScore.insightNoData');
        }
      
      case 'budget':
        if (insight.status === 'all_good') {
          return t('healthScore.insightBudgetGood', { count: insight.totalCategories });
        } else if (insight.status === 'one_over') {
          return t('healthScore.insightBudgetOneOver');
        } else if (insight.status === 'multiple_over') {
          return t('healthScore.insightBudgetMultipleOver', { count: insight.categoriesOver });
        } else {
          return t('healthScore.insightBudgetNoData');
        }
      
      case 'savings':
        if (insight.status === 'saving') {
          return t('healthScore.insightSaving', { amount: insight.amount.toFixed(2) });
        } else if (insight.status === 'overspending') {
          return t('healthScore.insightLosing', { amount: insight.amount.toFixed(2) });
        } else {
          return t('healthScore.insightBreakEven');
        }
      
      default:
        return '';
    }
  };

  const getInsightIcon = (type) => {
    switch (type) {
      case 'income_expense':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'budget':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'savings':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatMonth = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
  };

  if (loading) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-600 rounded w-1/3 mb-6"></div>
            <div className="flex justify-center mb-6">
              <div className="w-32 h-32 bg-gray-200 dark:bg-gray-600 rounded-full"></div>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-full"></div>
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
        </div>
      </Card>
    );
  }

  if (!score) {
    return (
      <Card className="mt-4 sm:mt-6">
        <div className="p-6 text-center">
          <div className="text-gray-400 dark:text-gray-500 mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
            {t('healthScore.noData')}
          </h3>
          <p className="text-gray-500 dark:text-gray-400">
            {t('healthScore.noDataDesc')}
          </p>
        </div>
      </Card>
    );
  }

  const scoreColors = getScoreColor(score.totalScore);
  // Use fixed radius for accurate calculation
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  // Cap at 100% to prevent overflow
  const displayScore = Math.min(score.totalScore, 100);
  const strokeDashoffset = circumference - (displayScore / 100) * circumference;

  if (compact) {
    const compactRadius = 42;
    const compactCirc = 2 * Math.PI * compactRadius;
    const compactOffset = compactCirc - (displayScore / 100) * compactCirc;

    return (
      <Card>
        <div className="p-4 sm:p-6 flex items-center gap-4">
          <div className="relative flex-shrink-0">
            <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r={compactRadius} fill="none" stroke="currentColor" strokeWidth="7" className="text-gray-200 dark:text-gray-600" />
              <circle cx="50" cy="50" r={compactRadius} fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" className={scoreColors.text} style={{ strokeDasharray: compactCirc, strokeDashoffset: compactOffset, transition: 'stroke-dashoffset 0.5s ease-in-out' }} />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-lg font-bold ${scoreColors.text}`}>{Math.round(score.totalScore)}</span>
            </div>
          </div>
          <div>
            <p className={`text-xl font-bold ${scoreColors.text}`}>{getScoreLabel(score.totalScore)}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('healthScore.title')}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="mt-4 sm:mt-6">
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
              {t('healthScore.title')}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('healthScore.description')}
            </p>
          </div>
        </div>

        {/* Score Display */}
        <div className="flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          {/* Circular Score */}
          <div className="relative flex-shrink-0">
            <svg className="w-32 h-32 sm:w-40 sm:h-40 transform -rotate-90" viewBox="0 0 120 120">
              {/* Background circle */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-600"
              />
              {/* Progress circle */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                strokeLinecap="round"
                className={scoreColors.text}
                style={{
                  strokeDasharray: circumference,
                  strokeDashoffset: strokeDashoffset,
                  transition: 'stroke-dashoffset 0.5s ease-in-out'
                }}
              />
            </svg>
            {/* Score text in center */}
            <div className="absolute inset-0 flex flex-col items-center justify-center transform rotate-0">
              <span className={`text-3xl sm:text-4xl font-bold ${scoreColors.text}`}>
                {Math.round(score.totalScore)}
              </span>
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">
                {getScoreLabel(score.totalScore)}
              </span>
            </div>
          </div>

          {/* Score Breakdown — locked for free users */}
          {isPremium ? (
            <div className="flex-1 w-full space-y-3">
              {/* Budget Adherence */}
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-28 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {t('healthScore.budgetAdherence')}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score.budgetAdherenceScore, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  {Math.round(score.budgetAdherenceScore)}
                </span>
              </div>

              {/* Income vs Expenses */}
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-28 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {t('healthScore.incomeRatio')}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score.incomeExpenseRatioScore, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  {Math.round(score.incomeExpenseRatioScore)}
                </span>
              </div>

              {/* Spending Volatility */}
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-28 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {t('healthScore.consistency')}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score.spendingVolatilityScore, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  {Math.round(score.spendingVolatilityScore)}
                </span>
              </div>

              {/* Savings Consistency */}
              <div className="flex items-center gap-3">
                <div className="w-24 sm:w-28 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {t('healthScore.savings')}
                </div>
                <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${Math.min(score.savingsConsistencyScore, 100)}%` }}
                  />
                </div>
                <span className="w-10 text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 text-right">
                  {Math.round(score.savingsConsistencyScore)}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex-1 w-full space-y-3">
              {[t('healthScore.budgetAdherence'), t('healthScore.incomeRatio'), t('healthScore.consistency'), t('healthScore.savings')].map((label, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-24 sm:w-28 text-xs sm:text-sm text-gray-500 dark:text-gray-500">{label}</div>
                  <div className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full bg-gray-300 dark:bg-gray-600 rounded-full" style={{ width: `${[65, 40, 75, 55][i]}%` }} />
                  </div>
                  <span className="w-10 text-xs sm:text-sm font-medium text-gray-400 dark:text-gray-500 text-right">
                    <svg className="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Premium upsell banner for free users */}
        {!isPremium && (
          <div className="mt-6">
            <Link
              to="/pricing"
              className="flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 border border-indigo-200/50 dark:border-indigo-700/30 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{t('healthScore.unlockFull')}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t('healthScore.unlockFullDesc')}</p>
                </div>
              </div>
              <svg className="w-5 h-5 text-gray-400 dark:text-gray-500 group-hover:text-indigo-500 transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}

        {/* Insights */}
        {score.insights && score.insights.length > 0 && isPremium && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              {t('healthScore.insights')}
            </h3>
            <ul className="space-y-3">
              {score.insights.map((insight, index) => (
                <li key={index} className="flex items-start gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getInsightIcon(insight.type)}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {getInsightText(insight)}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Quick Stats */}
        {isPremium && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('healthScore.income')}</p>
                <p className="text-sm sm:text-base font-semibold text-green-600 dark:text-green-400">
                  €{score.totalIncome.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('healthScore.expenses')}</p>
                <p className="text-sm sm:text-base font-semibold text-red-600 dark:text-red-400">
                  €{score.totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{t('healthScore.saved')}</p>
                <p className={`text-sm sm:text-base font-semibold ${score.savingsAmount >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'}`}>
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
