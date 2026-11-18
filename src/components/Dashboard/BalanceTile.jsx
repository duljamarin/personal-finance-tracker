import { useTranslation } from 'react-i18next';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';
import Card from '../UI/Card';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { useCountUp } from '../../hooks/useCountUp';
import { dataDelay, delayStyle } from '../../utils/motion';
import { formatMonthName, formatMonthShort } from '../../utils/date';
import { monthKeyOf } from '../../utils/finance/dashboardModel';
import { linePath } from '../../utils/bento';

const W = 600;
const H = 120;

// Delta vs the same day-span of last month, white on the hero tile (V5:
// brand or red text would fail contrast on green, so the arrow carries it).
function Delta({ current, previous, hasPrev }) {
  const { t } = useTranslation();
  if (!hasPrev || previous <= 0) {
    return <p className="mt-1 text-sm font-semibold">{t('dashboard.noLastMonth')}</p>;
  }
  const pct = ((current - previous) / previous) * 100;
  const Arrow = pct >= 0 ? ArrowUpRight : ArrowDownRight;
  const [before, after] = t('dashboard.vsLastMonth', { value: '%%' }).split('%%');
  return (
    <p className="mt-1 text-sm font-semibold">
      {before}
      <span className="inline-flex items-center gap-0.5 font-extrabold tabular-nums">
        <Arrow className="w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
        {Math.abs(pct).toFixed(0)}%
      </span>
      {after}
    </p>
  );
}

function InsetStat({ label, value, delay, children }) {
  const { format } = useDisplayCurrency();
  const shown = useCountUp(value, { delay });
  return (
    <div className="px-3.5 py-2.5 rounded-icon bg-hero-inset min-w-0">
      <p className="text-sm font-semibold">{label}</p>
      <p className="text-h3 font-extrabold tabular-nums">{format(shown)}</p>
      {children}
    </div>
  );
}

/**
 * Balance hero tile (spec 4.1, row 1): the one green tile on the dashboard.
 * Balance = net of every transaction; chips = selected month income /
 * spending; line = balance at the end of each of the last 8 months.
 */
export default function BalanceTile({ net, totals, series, monthRef, index = 0, className = '' }) {
  const { t, i18n } = useTranslation();
  const { format, currency } = useDisplayCurrency();
  const delay = dataDelay(index);
  const balance = useCountUp(net, { delay });
  const month = formatMonthName(monthRef, i18n.language);
  const values = series.map((p) => p.balance);
  const line = linePath(values);
  const area = line ? `${line} L${W} ${H} L0 ${H} Z` : '';
  const key = monthKeyOf(monthRef);

  return (
    <Card variant="hero" index={index} className={`flex flex-col gap-[14px] overflow-hidden ${className}`}>
      <div className="flex flex-wrap justify-between gap-gap">
        <div className="min-w-0">
          <p className="text-sm font-bold">{t('dashboard.balanceAllTime')}</p>
          <p className="mt-1 text-kpi font-extrabold tabular-nums [overflow-wrap:anywhere]">{format(balance)}</p>
          <p className="mt-1 text-sm font-semibold">{t('dashboard.balanceNote')} · {currency}</p>
        </div>
        <div className="flex flex-wrap items-start gap-2.5">
          <InsetStat label={t('dashboard.incomeMonth', { month })} value={totals.income} delay={delay}>
            <Delta current={totals.income} previous={totals.prevIncome} hasPrev={totals.hasPrev} />
          </InsetStat>
          <InsetStat label={t('dashboard.spendingMonth', { month })} value={totals.expense} delay={delay}>
            <Delta current={totals.expense} previous={totals.prevExpense} hasPrev={totals.hasPrev} />
          </InsetStat>
        </div>
      </div>

      {line && (
        <>
          <svg
            role="img"
            aria-label={t('dashboard.balanceTrend', { count: series.length })}
            width="100%"
            height={H}
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block"
          >
            <path key={`a-${key}`} d={area} className="animate-fade-in" style={{ fill: 'var(--hero-area)', ...delayStyle(delay + 300) }} />
            <path
              key={`l-${key}`}
              d={line}
              fill="none"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
              pathLength="1"
              strokeDasharray="1"
              className="animate-draw"
              style={{ stroke: 'var(--white)', strokeDashoffset: 0, '--len': 1, ...delayStyle(delay) }}
            />
          </svg>
          <ol className="flex justify-between text-sm font-bold" aria-hidden="true">
            {series.map((p) => (
              <li key={p.key}>{formatMonthShort(p.date, i18n.language)}</li>
            ))}
          </ol>
        </>
      )}
    </Card>
  );
}
