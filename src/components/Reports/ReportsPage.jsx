import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchTransactionsForReport } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import LoadingSpinner from '../UI/LoadingSpinner';
import EmptyState from '../UI/EmptyState';
import ReportSummaryCards from './ReportSummaryCards';
import ReportCategoryBreakdown from './ReportCategoryBreakdown';
import ReportIncomeBreakdown from './ReportIncomeBreakdown';
import ReportDailyTrend from './ReportDailyTrend';
import ReportTopTransactions from './ReportTopTransactions';
import ReportPeriodComparison from './ReportPeriodComparison';
import { toISODate, getThisMonth, getLastMonth, getThisQuarter, getLast3Months, getThisYear } from '../../utils/date';

/**
 * Compute the previous period of equal calendar length immediately before startDate.
 */
function getPrevPeriod(startDate, endDate) {
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');

  const lastDayOfEndMonth = new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate();
  const isMonthAligned = start.getDate() === 1 && end.getDate() === lastDayOfEndMonth;

  if (isMonthAligned) {
    const monthSpan =
      (end.getFullYear() - start.getFullYear()) * 12
      + (end.getMonth() - start.getMonth())
      + 1;
    const prevStart = new Date(start.getFullYear(), start.getMonth() - monthSpan, 1);
    const prevEnd = new Date(start.getFullYear(), start.getMonth(), 0);
    return { start: toISODate(prevStart), end: toISODate(prevEnd) };
  }

  const days = Math.round((end - start) / (1000 * 60 * 60 * 24));
  const prevEnd = new Date(start.getFullYear(), start.getMonth(), start.getDate() - 1);
  const prevStart = new Date(prevEnd.getFullYear(), prevEnd.getMonth(), prevEnd.getDate() - days);
  return { start: toISODate(prevStart), end: toISODate(prevEnd) };
}

const PRESETS = [
  { key: 'thisMonth', fn: getThisMonth },
  { key: 'lastMonth', fn: getLastMonth },
  { key: 'thisQuarter', fn: getThisQuarter },
  { key: 'last3Months', fn: getLast3Months },
  { key: 'thisYear', fn: getThisYear },
];

export default function ReportsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  const initial = getThisMonth();
  const [activePreset, setActivePreset] = useState('thisMonth');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);

  const [transactions, setTransactions] = useState([]);
  const [prevTransactions, setPrevTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const prev = getPrevPeriod(startDate, endDate);

  const loadData = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const prevP = getPrevPeriod(start, end);
      const [curr, prevData] = await Promise.all([
        fetchTransactionsForReport(start, end),
        fetchTransactionsForReport(prevP.start, prevP.end),
      ]);
      setTransactions(curr);
      setPrevTransactions(prevData);
    } catch (err) {
      console.error('Reports load error:', err);
      addToast(t('messages.error'), 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    loadData(startDate, endDate);
  }, [startDate, endDate, loadData]);

  function applyPreset(key, fn) {
    setActivePreset(key);
    const { start, end } = fn();
    setStartDate(start);
    setEndDate(end);
  }

  function handleCustomStart(e) {
    setActivePreset('custom');
    setStartDate(e.target.value);
  }

  function handleCustomEnd(e) {
    setActivePreset('custom');
    setEndDate(e.target.value);
  }

  const hasData = transactions.length > 0;

  const dateInputClass =
    'text-sm px-3 py-2 rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition';

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-semibold tracking-tight text-3xl text-ink-primary dark:text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-brand-600 dark:text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('reports.title')}
          </h1>
          <p className="text-ink-muted dark:text-white mt-1">
            {startDate} - {endDate}
          </p>
        </div>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 items-center">
        {PRESETS.map(({ key, fn }) => (
          <button
            key={key}
            onClick={() => applyPreset(key, fn)}
            className={`px-4 py-2 rounded-md font-medium text-sm transition ${
              activePreset === key
                ? 'bg-brand-600 text-white'
                : 'bg-surface-subtle dark:bg-surface-dark-subtle text-ink-primary dark:text-white hover:bg-surface-hairline dark:hover:bg-surface-dark-hairline border border-surface-hairline dark:border-surface-dark-hairline'
            }`}
          >
            {t(`reports.${key}`)}
          </button>
        ))}

        {/* Custom date inputs */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={handleCustomStart}
            className={dateInputClass}
          />
          <span className="text-ink-muted dark:text-white text-sm">-</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={handleCustomEnd}
            className={dateInputClass}
          />
        </div>
      </div>

      {/* Report content */}
      <div className="space-y-6">
        {loading ? (
          <LoadingSpinner size="md" className="min-h-[40vh]" />
        ) : !hasData ? (
          <EmptyState
            icon={<svg className="w-10 h-10 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
            title={t('reports.noData')}
            description={`${startDate} - ${endDate}`}
          />
        ) : (
          <>
            <ReportSummaryCards
              transactions={transactions}
              prevTransactions={prevTransactions}
              startDate={startDate}
              endDate={endDate}
            />
            <ReportDailyTrend
              transactions={transactions}
              startDate={startDate}
              endDate={endDate}
            />
            <ReportCategoryBreakdown transactions={transactions} />
            <ReportIncomeBreakdown transactions={transactions} />
            <ReportTopTransactions transactions={transactions} />
            <ReportPeriodComparison
              transactions={transactions}
              prevTransactions={prevTransactions}
              startDate={startDate}
              endDate={endDate}
              prevStartDate={prev.start}
              prevEndDate={prev.end}
            />
          </>
        )}
      </div>
    </div>
  );
}
