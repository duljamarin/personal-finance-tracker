import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

// goodWhenUp: income up is good, spending up is not — color by meaning, not direction.
// On the hero tile the delta is white; the arrow-free sign carries direction
// (brand / red text would fail contrast on green, V5).
function ChangeIndicator({ current, previous, goodWhenUp = true }) {
  const { t } = useTranslation();
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="text-sm font-semibold">
        {t('reports.vsLastPeriod')}
      </span>
    );
  }

  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const isUp = diff > 0;
  const good = diff === 0 || isUp === goodWhenUp;

  return (
    <span className="block text-sm font-semibold tabular-nums" data-good={good}>
      <span className="font-extrabold">{isUp ? '+' : '−'}{Math.abs(pct)}%</span>&nbsp;{t('reports.vsLastPeriod')}
    </span>
  );
}

export default function ReportSummaryCards({ transactions, prevTransactions, startDate, endDate, index }) {
  const { t } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
  // Card values are summed from base_amount (EUR).
  const formatAmount = (amount) => fmt(Math.abs(amount));

  const calcTotals = (txs) => {
    const income = txs
      .filter(tx => tx.type === 'income')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    const expenses = txs
      .filter(tx => tx.type === 'expense')
      .reduce((sum, tx) => sum + (tx.base_amount ?? tx.amount ?? 0), 0);
    return { income, expenses, net: income - expenses };
  };

  const curr = calcTotals(transactions);
  const prev = calcTotals(prevTransactions);

  const savingsRate = curr.income > 0 ? ((curr.net / curr.income) * 100) : 0;
  const prevSavingsRate = prev.income > 0 ? ((prev.net / prev.income) * 100) : 0;

  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailySpend = curr.expenses / days;

  const cards = [
    {
      label: t('reports.totalIncome'),
      value: curr.income,
      prevValue: prev.income,
      tone: 'income',
      format: 'currency',
    },
    {
      label: t('reports.totalExpenses'),
      value: curr.expenses,
      prevValue: prev.expenses,
      tone: 'expense',
      format: 'currency',
      goodWhenUp: false,
    },
    {
      label: t('reports.netSavings'),
      value: curr.net,
      prevValue: prev.net,
      tone: curr.net >= 0 ? 'brand' : 'expense',
      format: 'currency',
    },
    {
      label: t('reports.savingsRate'),
      value: savingsRate,
      prevValue: prevSavingsRate,
      tone: savingsRate >= 0 ? 'brand' : 'expense',
      format: 'percent',
    },
    {
      label: t('reports.transactionCount'),
      value: transactions.length,
      prevValue: prevTransactions.length,
      tone: 'neutral',
      format: 'number',
      neutralDelta: true,
    },
    {
      label: t('reports.avgDailySpend'),
      value: avgDailySpend,
      prevValue: null,
      tone: 'neutral',
      format: 'currency',
    },
  ];

  const formatValue = (val, format) => {
    if (format === 'percent') return `${val.toFixed(1)}%`;
    if (format === 'number') return val.toString();
    return `${val < 0 ? '−' : ''}${formatAmount(val)}`;
  };

  return (
    // The page's one hero tile (spec 4.4: summary cards as a tile row).
    <div className={`tile tile-hero tile-lift p-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 ${typeof index === 'number' ? 'animate-pop' : ''}`}>
      {cards.map((card) => (
        <div key={card.label} className="rounded-inner bg-hero-inset px-[18px] py-[14px] min-w-0 [overflow-wrap:anywhere]">
          <p className="text-sm font-bold mb-1">{card.label}</p>
          <p className="min-w-0 [overflow-wrap:anywhere] font-extrabold tabular-nums text-h3">
            {formatValue(card.value, card.format)}
          </p>
          {card.prevValue !== null && (
            <div className="mt-1">
              {card.neutralDelta
                ? <span className="text-sm font-semibold tabular-nums">{t('reports.prevCount', { count: card.prevValue })}</span>
                : <ChangeIndicator current={card.value} previous={card.prevValue} goodWhenUp={card.goodWhenUp !== false} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
