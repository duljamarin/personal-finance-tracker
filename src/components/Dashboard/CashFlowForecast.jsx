import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import { useTransactions } from '../../context/TransactionContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { fetchRecurringTransactions, calculateNextDate } from '../../utils/api';
import useDarkMode from '../../hooks/useDarkMode';

const HORIZONS = [30, 60, 90];
const PREMIUM_HORIZONS = [60, 90];

// Returns today's UTC date string (YYYY-MM-DD)
function utcDateStr(date) {
  return date.toISOString().split('T')[0];
}

// Add `n` UTC days to a YYYY-MM-DD string, return YYYY-MM-DD
function addUTCDays(dateStr, n) {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return utcDateStr(d);
}

function buildForecast(startingBalance, recurringList, days) {
  // Work exclusively with UTC date strings (YYYY-MM-DD) to avoid timezone drift.
  // Local-time Date objects shift the date when crossing midnight UTC, which causes
  // cumulative off-by-one errors across multiple loop iterations.
  const todayStr = utcDateStr(new Date());
  const horizonStr = addUTCDays(todayStr, days);

  // Build a map: dateString -> net change on that day
  const changesByDate = {};

  for (const rec of recurringList) {
    if (!rec.is_active) continue;

    // Extract the UTC date directly from the ISO string — never round-trip through
    // a local Date object, which would shift the date in non-UTC timezones.
    let currentDateStr = rec.next_run_at
      ? rec.next_run_at.split('T')[0]
      : rec.start_date;

    let occurrences = rec.occurrences_created || 0;
    const limit = rec.occurrences_limit || null;

    while (currentDateStr <= horizonStr) {
      // Check end_date
      if (rec.end_date && currentDateStr > rec.end_date) break;
      // Check occurrences limit
      if (limit !== null && occurrences >= limit) break;

      // Only count future occurrences (on or after today)
      if (currentDateStr >= todayStr) {
        const amount = rec.amount * (rec.exchange_rate || 1);
        const delta = rec.type === 'income' ? amount : -amount;
        changesByDate[currentDateStr] = (changesByDate[currentDateStr] || 0) + delta;
      }

      // calculateNextDate returns an ISO string — take only the date part (UTC)
      currentDateStr = calculateNextDate(
        currentDateStr,
        rec.frequency,
        rec.interval_count || 1
      ).split('T')[0];

      occurrences++;
    }
  }

  // Build daily data points
  const points = [];
  let runningBalance = startingBalance;

  points.push({ date: todayStr, balance: parseFloat(runningBalance.toFixed(2)), change: 0 });

  for (let i = 1; i <= days; i++) {
    const dateStr = addUTCDays(todayStr, i);
    const change = changesByDate[dateStr] || 0;
    runningBalance += change;
    points.push({
      date: dateStr,
      balance: parseFloat(runningBalance.toFixed(2)),
      change: parseFloat(change.toFixed(2)),
    });
  }

  return points;
}

function formatCurrency(value) {
  return `€${value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

function ForecastTooltip({ active, payload, label }) {
  const { t } = useTranslation();
  if (!active || !payload || payload.length === 0) return null;

  const balance = payload[0]?.value ?? 0;
  const change = payload[0]?.payload?.change ?? 0;

  return (
    <div className="bg-zinc-900 border border-zinc-800 text-white px-4 py-3 rounded-lg shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      <p className={balance >= 0 ? 'text-emerald-400' : 'text-red-400'}>
        {t('cashFlow.balance')}: {formatCurrency(balance)}
      </p>
      {change !== 0 && (
        <p className={`mt-1 ${change > 0 ? 'text-emerald-300' : 'text-red-300'}`}>
          {change > 0 ? '+' : ''}{formatCurrency(change)}
        </p>
      )}
    </div>
  );
}

export default function CashFlowForecast() {
  const { t } = useTranslation();
  const { net } = useTransactions();
  const { isPremium, isTrialing } = useSubscription();
  const isPaid = isPremium || isTrialing;
  const [dark] = useDarkMode();
  const [horizon, setHorizon] = useState(30);

  // Reset to 30 if subscription lapses while a premium horizon is active
  useEffect(() => {
    if (!isPaid && PREMIUM_HORIZONS.includes(horizon)) setHorizon(30);
  }, [isPaid, horizon]);
  const [recurring, setRecurring] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchRecurringTransactions()
      .then((data) => { if (!cancelled) setRecurring(data || []); })
      .catch(() => { if (!cancelled) setRecurring([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const forecastData = useMemo(
    () => buildForecast(net, recurring, horizon),
    [net, recurring, horizon]
  );

  // Downsample to ~20 visible points so chart stays readable
  const chartData = useMemo(() => {
    if (forecastData.length <= 20) return forecastData;
    const step = Math.ceil(forecastData.length / 20);
    return forecastData.filter((_, i) => i % step === 0 || i === forecastData.length - 1);
  }, [forecastData]);

  const endBalance = forecastData[forecastData.length - 1]?.balance ?? net;
  const delta = endBalance - net;
  const hasRecurring = recurring.some((r) => r.is_active);

  const axisColor = dark ? '#9ca3af' : '#6b7280';
  const gridColor = dark ? '#27272a' : '#e5e7eb';
  const areaColor = endBalance >= 0 ? '#10b981' : '#ef4444';
  const areaFill = endBalance >= 0 ? '#10b98133' : '#ef444433';

  return (
    <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-zinc-800 mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
            {t('cashFlow.title')}
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('cashFlow.subtitle')}
          </p>
        </div>
        <div className="flex gap-1">
          {HORIZONS.map((h) => {
            const locked = PREMIUM_HORIZONS.includes(h) && !isPaid;
            return (
              <button
                key={h}
                onClick={() => !locked && setHorizon(h)}
                title={locked ? t('cashFlow.premiumOnly') : undefined}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                  locked
                    ? 'bg-gray-100 dark:bg-zinc-800 text-gray-300 dark:text-zinc-600 cursor-not-allowed'
                    : horizon === h
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                }`}
              >
                {t(`cashFlow.horizon.${h}`)}
                {locked && (
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary pill */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-gray-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('cashFlow.currentBalance')}</p>
          <p className={`text-sm font-bold ${net >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(net)}
          </p>
        </div>
        <div className="text-gray-400 dark:text-gray-600 text-lg font-light">→</div>
        <div className="flex-1 bg-gray-50 dark:bg-zinc-800/60 rounded-lg px-3 py-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">{t(`cashFlow.projectedIn.${horizon}`)}</p>
          <p className={`text-sm font-bold ${endBalance >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
            {formatCurrency(endBalance)}
          </p>
        </div>
        {delta !== 0 && (
          <div className={`text-xs font-medium px-2 py-1 rounded-full ${
            delta >= 0
              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400'
          }`}>
            {delta > 0 ? '+' : ''}{formatCurrency(delta)}
          </div>
        )}
      </div>

      {/* Chart */}
      {loading ? (
        <div className="h-48 flex items-center justify-center">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-600 dark:border-brand-400" />
        </div>
      ) : !hasRecurring ? (
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('cashFlow.noRecurring')}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t('cashFlow.noRecurringHint')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 4, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="cfGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={areaColor} stopOpacity={0.25} />
                <stop offset="95%" stopColor={areaColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: axisColor }}
              tickFormatter={(d) => {
                const dt = new Date(d + 'T00:00:00');
                return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: axisColor }}
              tickFormatter={formatCurrency}
              width={60}
            />
            <Tooltip content={<ForecastTooltip />} />
            <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={areaColor}
              strokeWidth={2}
              fill="url(#cfGradient)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
