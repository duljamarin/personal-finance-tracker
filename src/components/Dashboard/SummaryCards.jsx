import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { formatMonthName } from '../../utils/date';

const amountOf = (tx) => tx.base_amount || tx.amount || 0;

// Month-to-date totals for this month, and for the same day-span of last month
// (1st..today's day-of-month). Comparing a partial month against a full one
// would make every early-month delta look like a collapse in spending.
function monthTotals(transactions) {
  const now = new Date();
  const day = now.getDate();
  const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const curKey = ym(now);
  const prevKey = ym(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const out = { income: 0, expense: 0, prevIncome: 0, prevExpense: 0, hasPrev: false };
  for (const tx of transactions) {
    const date = tx.date || '';
    const key = date.slice(0, 7);
    if (key === curKey) {
      if (tx.type === 'income') out.income += amountOf(tx);
      else if (tx.type === 'expense') out.expense += amountOf(tx);
    } else if (key === prevKey) {
      out.hasPrev = true;
      if (Number(date.slice(8, 10)) > day) continue;
      if (tx.type === 'income') out.prevIncome += amountOf(tx);
      else if (tx.type === 'expense') out.prevExpense += amountOf(tx);
    }
  }
  return out;
}

function Delta({ current, previous, hasPrev, goodWhenUp }) {
  const { t } = useTranslation();
  if (!hasPrev || previous <= 0) {
    return <p className="mt-2 text-xs text-ink-muted dark:text-white">{t('dashboard.noLastMonth')}</p>;
  }
  const pct = ((current - previous) / previous) * 100;
  const up = pct >= 0;
  const good = up === goodWhenUp;
  const Arrow = up ? ArrowUpRight : ArrowDownRight;
  const value = (
    <span className={`inline-flex items-center gap-0.5 font-semibold tabular-nums ${good ? 'text-brand-600 dark:text-brand-400' : 'text-expense'}`}>
      <Arrow className="w-3.5 h-3.5" strokeWidth={2} aria-hidden="true" />
      {Math.abs(pct).toFixed(0)}%
    </span>
  );
  // Split around the placeholder so the colored figure stays a real element.
  const [before, after] = t('dashboard.vsLastMonth', { value: '%%' }).split('%%');
  return (
    <p className="mt-2 text-xs text-ink-muted dark:text-white">
      {before}{value}{after}
    </p>
  );
}

export default function SummaryCards({ totalIncome, totalExpense, net, loading, transactions = [] }) {
  const { t, i18n } = useTranslation();
  const { format: formatCurrency, currency } = useDisplayCurrency();
  const month = formatMonthName(new Date(), i18n.language);

  const m = useMemo(() => monthTotals(transactions), [transactions]);
  const savingsRate = m.income > 0 ? ((m.income - m.expense) / m.income) * 100 : null;

  const showSkeleton = loading && totalIncome === 0 && totalExpense === 0;
  const skeleton = (w) => <div className={`h-8 bg-surface-hairline dark:bg-surface-dark-hairline rounded-md ${w} animate-pulse`} />;

  return (
    // gap-px over a hairline-colored grid draws the dividers at every
    // breakpoint without per-cell border bookkeeping.
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1fr] gap-px bg-surface-hairline dark:bg-surface-dark-hairline border border-surface-hairline dark:border-surface-dark-hairline rounded-container overflow-hidden">
      {/* Balance — the one hero number on the screen */}
      <div className="sm:col-span-2 lg:col-span-1 bg-white dark:bg-surface-dark-card p-5 sm:p-6">
        <p className="eyebrow">{t('dashboard.balanceAllTime')}</p>
        {showSkeleton ? (
          <div className="mt-3">{skeleton('w-2/3 h-10')}</div>
        ) : (
          <p className={`mt-2 min-w-0 [overflow-wrap:anywhere] text-4xl sm:text-[2.75rem] font-semibold tabular-nums tracking-tight leading-none ${net < 0 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
            {formatCurrency(net)}
          </p>
        )}
        <p className="mt-3 text-xs text-ink-muted dark:text-white">
          {t('dashboard.balanceNote')} · {currency}
        </p>
      </div>

      <div className="bg-white dark:bg-surface-dark-card p-5 sm:p-6">
        <p className="eyebrow">{t('dashboard.incomeMonth', { month })}</p>
        {showSkeleton ? <div className="mt-3">{skeleton('w-1/2')}</div> : (
          <p className="mt-2 [overflow-wrap:anywhere] text-2xl font-semibold tabular-nums tracking-tight leading-none text-brand-600 dark:text-brand-400">
            {formatCurrency(m.income)}
          </p>
        )}
        <Delta current={m.income} previous={m.prevIncome} hasPrev={m.hasPrev} goodWhenUp />
      </div>

      <div className="bg-white dark:bg-surface-dark-card p-5 sm:p-6">
        <p className="eyebrow">{t('dashboard.spendingMonth', { month })}</p>
        {showSkeleton ? <div className="mt-3">{skeleton('w-1/2')}</div> : (
          <p className="mt-2 [overflow-wrap:anywhere] text-2xl font-semibold tabular-nums tracking-tight leading-none text-ink-primary dark:text-white">
            {formatCurrency(m.expense)}
          </p>
        )}
        <Delta current={m.expense} previous={m.prevExpense} hasPrev={m.hasPrev} goodWhenUp={false} />
      </div>

      <div className="bg-white dark:bg-surface-dark-card p-5 sm:p-6">
        <p className="eyebrow">{t('dashboard.savingsRate')}</p>
        {showSkeleton ? <div className="mt-3">{skeleton('w-1/3')}</div> : (
          <p className={`mt-2 text-2xl font-semibold tabular-nums tracking-tight leading-none ${savingsRate !== null && savingsRate < 0 ? 'text-expense' : 'text-ink-primary dark:text-white'}`}>
            {savingsRate === null ? '–' : `${savingsRate.toFixed(0)}%`}
          </p>
        )}
        {savingsRate !== null && (
          <div className="mt-3 h-1.5 w-full rounded-full bg-surface-hairline dark:bg-surface-dark-hairline overflow-hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-brand-500"
              style={{ width: `${Math.max(0, Math.min(100, savingsRate))}%` }}
            />
          </div>
        )}
        <p className="mt-2 text-xs text-ink-muted dark:text-white">
          {savingsRate === null ? t('dashboard.noIncomeYet') : t('dashboard.savingsRateNote')}
        </p>
      </div>
    </section>
  );
}
