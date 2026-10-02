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
import PageHeader from '../UI/PageHeader';
import SegmentedControl from '../UI/SegmentedControl';
import { FileText } from 'lucide-react';
import { formatDate, toISODate, getThisMonth, getLastMonth, getThisQuarter, getLast3Months, getThisYear } from '../../utils/date';

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
  const { t, i18n } = useTranslation();
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
    'text-sm px-3 py-2 rounded-md border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 transition';

  const rangeLabel = `${formatDate(new Date(`${startDate}T00:00:00`), i18n.language)} – ${formatDate(new Date(`${endDate}T00:00:00`), i18n.language)}`;

  return (
    <div className="space-y-6">
      <PageHeader title={t('reports.title')} subtitle={rangeLabel} className="!mb-0" />

      {/* Period selector: presets + custom range in one toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="max-w-full overflow-x-auto scrollbar-hide">
          <SegmentedControl
            value={activePreset}
            onChange={(key) => {
              const preset = PRESETS.find(p => p.key === key);
              if (preset) applyPreset(preset.key, preset.fn);
            }}
            options={PRESETS.map(({ key }) => ({ value: key, label: t(`reports.${key}`) }))}
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={startDate}
            max={endDate}
            onChange={handleCustomStart}
            aria-label={t('reports.periodLabel')}
            className={dateInputClass}
          />
          <span className="text-ink-muted dark:text-white text-sm">–</span>
          <input
            type="date"
            value={endDate}
            min={startDate}
            onChange={handleCustomEnd}
            aria-label={t('reports.periodLabel')}
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
            icon={<FileText className="w-5 h-5" strokeWidth={1.75} />}
            title={t('reports.noData')}
            description={rangeLabel}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <ReportCategoryBreakdown transactions={transactions} />
              <ReportIncomeBreakdown transactions={transactions} />
            </div>
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
