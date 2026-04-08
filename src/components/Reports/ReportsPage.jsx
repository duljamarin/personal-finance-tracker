import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { fetchTransactionsForReport } from '../../utils/api';
import { useToast } from '../../context/ToastContext';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import ReportSummaryCards from './ReportSummaryCards';
import ReportCategoryBreakdown from './ReportCategoryBreakdown';
import ReportPeriodComparison from './ReportPeriodComparison';

// ─── Date helpers ────────────────────────────────────────────────────────────

function toISODate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getThisMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function getLastMonth() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function getThisQuarter() {
  const now = new Date();
  const q = Math.floor(now.getMonth() / 3);
  const start = new Date(now.getFullYear(), q * 3, 1);
  const end = new Date(now.getFullYear(), q * 3 + 3, 0);
  return { start: toISODate(start), end: toISODate(end) };
}

function getLast3Months() {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { start: toISODate(start), end: toISODate(end) };
}

function getThisYear() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const end = new Date(now.getFullYear(), 11, 31);
  return { start: toISODate(start), end: toISODate(end) };
}

/**
 * Compute the previous period of equal calendar length immediately before startDate.
 * For month-aligned periods (1st to last day of month) it shifts by whole months,
 * correctly handling varying month lengths and leap years.
 * For custom ranges it falls back to day-count arithmetic.
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

// ─── Preset config ────────────────────────────────────────────────────────────

const PRESETS = [
  { key: 'thisMonth', fn: getThisMonth },
  { key: 'lastMonth', fn: getLastMonth },
  { key: 'thisQuarter', fn: getThisQuarter },
  { key: 'last3Months', fn: getLast3Months },
  { key: 'thisYear', fn: getThisYear },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { t } = useTranslation();
  const { addToast } = useToast();

  // Period state
  const initial = getThisMonth();
  const [activePreset, setActivePreset] = useState('thisMonth');
  const [startDate, setStartDate] = useState(initial.start);
  const [endDate, setEndDate] = useState(initial.end);

  // Data state
  const [transactions, setTransactions] = useState([]);
  const [prevTransactions, setPrevTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Derived prev period
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

  if (loading) {
    return <LoadingSpinner size="md" className="min-h-[60vh]" />;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
            <svg className="w-8 h-8 text-brand-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            {t('reports.title')}
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
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
            className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
              activePreset === key
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-600'
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
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-800 focus:border-brand-500 dark:focus:border-brand-500 transition"
          />
          <span className="text-gray-400 dark:text-gray-500 text-sm">-</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={handleCustomEnd}
            className="text-sm px-3 py-2 rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-800 focus:border-brand-500 dark:focus:border-brand-500 transition"
          />
        </div>
      </div>

      {/* Report content */}
      <div className="space-y-6">
        {!hasData ? (
          <Card>
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {t('reports.noData')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400 max-w-sm mx-auto">
                {startDate} - {endDate}
              </p>
            </div>
          </Card>
        ) : (
          <>
            <ReportSummaryCards
              transactions={transactions}
              prevTransactions={prevTransactions}
            />
            <ReportCategoryBreakdown transactions={transactions} />
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
