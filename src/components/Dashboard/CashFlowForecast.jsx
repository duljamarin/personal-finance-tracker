import { useState, useEffect, useMemo } from 'react';
import Card from '../UI/Card';
import LoadingSpinner from '../UI/LoadingSpinner';
import { MINUS } from '../../utils/bento';
import { AXIS_PROPS, CHART_GRID, CHART_TOOLTIP_CLASS, useChartAnimation } from '../../utils/chartTheme';
import { useTranslation } from 'react-i18next';
import { INCOME_COLOR, EXPENSE_COLOR } from '../../utils/chartColors';
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
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { getDateLocale } from '../../utils/date';

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

    // Extract the UTC date directly from the ISO string - never round-trip through
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

      // calculateNextDate returns an ISO string - take only the date part (UTC).
      // Pass the same start_date anchor the processor uses, otherwise the
      // forecast drifts off the dates that actually get generated.
      currentDateStr = calculateNextDate(
        currentDateStr,
        rec.frequency,
        rec.interval_count || 1,
        rec.start_date ? new Date(rec.start_date).getUTCDate() : null
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


function ForecastTooltip({ active, payload, label }) {
  const { t } = useTranslation();
  const { format: fmtCurrency } = useDisplayCurrency();
  if (!active || !payload || payload.length === 0) return null;

  const balance = payload[0]?.value ?? 0;
  const change = payload[0]?.payload?.change ?? 0;

  return (
    <div className={CHART_TOOLTIP_CLASS}>
      <p className="font-extrabold mb-1">{label}</p>
      <p className="tabular-nums">
        {t('cashFlow.balance')}: {fmtCurrency(balance, { compact: true })}
      </p>
      {change !== 0 && (
        <p className={`tabular-nums mt-0.5 ${change > 0 ? 'text-brand-text' : ''}`}>
          {change > 0 ? '+' : MINUS}{fmtCurrency(Math.abs(change), { compact: true })}
        </p>
      )}
    </div>
  );
}

export default function CashFlowForecast({ index }) {
  const { t, i18n } = useTranslation();
  const { format: fmtCurrency } = useDisplayCurrency();
  const dateLocale = getDateLocale(i18n.language);
  const { net, transactions } = useTransactions();
  const { isPremium, isTrialing } = useSubscription();
  const isPaid = isPremium || isTrialing;
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
  }, [transactions]);

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

  // A projected negative balance is the one red signal here (an error state
  // for the user's cash); everything else is brand or ink.
  const areaColor = endBalance >= 0 ? INCOME_COLOR : EXPENSE_COLOR;
  const anim = useChartAnimation();

  return (
    <Card index={index}>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-gap">
        <div>
          <h2 className="text-h3 font-bold text-fg">
            {t('cashFlow.title')}
          </h2>
          <p className="text-sm font-semibold text-fg mt-0.5">
            {t('cashFlow.subtitle')}
          </p>
        </div>
        <div role="group" aria-label={t('cashFlow.title')} className="inline-flex p-1 rounded-pill bg-inner">
          {HORIZONS.map((h) => {
            const locked = PREMIUM_HORIZONS.includes(h) && !isPaid;
            return (
              <button
                key={h}
                onClick={() => !locked && setHorizon(h)}
                title={locked ? t('cashFlow.premiumOnly') : undefined}
                aria-pressed={!locked && horizon === h}
                type="button"
                className={`btn-motion flex items-center gap-1 min-h-11 px-3 text-sm rounded-pill font-bold tabular-nums ${
                  locked
                    ? 'text-fg opacity-60 cursor-not-allowed'
                    : horizon === h
                      ? 'shadow-pill text-fg'
                      : 'text-fg hover:bg-inner-2'
                }`}
                style={!locked && horizon === h ? { backgroundColor: 'var(--seg-pill)' } : undefined}
              >
                {t(`cashFlow.horizon.${h}`)}
                {locked && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Today -> projected, as two figures on one line */}
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 mb-gap">
        <div>
          <p className="text-sm font-bold text-fg">{t('cashFlow.trackedBalance')}</p>
          <p className={`mt-1 text-h1 font-extrabold tabular-nums ${net >= 0 ? 'text-fg' : 'text-expense'}`}>
            {fmtCurrency(net, { compact: true })}
          </p>
        </div>
        <span className="pb-2 text-fg" aria-hidden="true">→</span>
        <div>
          <p className="text-sm font-bold text-fg">{t(`cashFlow.projectedIn.${horizon}`)}</p>
          <p className={`mt-1 text-h1 font-extrabold tabular-nums ${endBalance >= 0 ? 'text-fg' : 'text-expense'}`}>
            {fmtCurrency(endBalance, { compact: true })}
          </p>
        </div>
        {/* Sub-unit deltas round to "-€0"; hide them. */}
        {Math.abs(delta) >= 0.5 && (
          <span className={`pb-2 text-sm font-extrabold tabular-nums ${delta >= 0 ? 'text-brand-text' : 'text-fg'}`}>
            {delta > 0 ? '+' : MINUS}{fmtCurrency(Math.abs(delta), { compact: true })}
          </span>
        )}
      </div>
      <p className="-mt-2 mb-gap text-sm font-semibold text-fg">{t('cashFlow.trackedBalanceNote')}</p>

      {/* Chart */}
      {loading ? (
        <div className="h-[220px] flex items-center justify-center">
          <LoadingSpinner size="sm" />
        </div>
      ) : !hasRecurring ? (
        <div className="h-[220px] tile-inner flex flex-col items-center justify-center text-center p-gap">
          <p className="text-base font-extrabold text-fg">{t('cashFlow.noRecurring')}</p>
          <p className="text-sm font-semibold text-fg mt-1">{t('cashFlow.noRecurringHint')}</p>
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
            <CartesianGrid {...CHART_GRID} />
            <XAxis
              dataKey="date"
              {...AXIS_PROPS}
              tickFormatter={(d) => {
                const dt = new Date(d + 'T00:00:00');
                return dt.toLocaleDateString(dateLocale, { month: 'short', day: 'numeric' });
              }}
            />
            <YAxis
              {...AXIS_PROPS}
              tickFormatter={(v) => fmtCurrency(v, { compact: true })}
              width={60}
            />
            <Tooltip content={<ForecastTooltip />} />
            <ReferenceLine y={0} stroke="var(--text)" strokeDasharray="4 4" />
            <Area
              type="monotone"
              dataKey="balance"
              stroke={areaColor}
              strokeWidth={2}
              fill="url(#cfGradient)"
              dot={false}
              activeDot={{ r: 4 }}
              {...anim}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </Card>
  );
}
