import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

// goodWhenUp: income up is good, spending up is not — color by meaning, not direction.
function ChangeIndicator({ current, previous, goodWhenUp = true }) {
  const { t } = useTranslation();
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="text-xs text-ink-muted dark:text-white">
        {t('reports.vsLastPeriod')}
      </span>
    );
  }

  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const isUp = diff > 0;
  const good = diff === 0 || isUp === goodWhenUp;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium tabular-nums ${good ? 'text-brand-600 dark:text-brand-400' : 'text-expense'}`}>
      {isUp ? '+' : '-'}{Math.abs(pct)}% {t('reports.vsLastPeriod')}
    </span>
  );
}

export default function ReportSummaryCards({ transactions, prevTransactions, startDate, endDate }) {
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
    return `${val < 0 ? '-' : ''}${formatAmount(val)}`;
  };

  const toneClass = (tone) => {
    switch (tone) {
      case 'income':
        return 'text-brand-600 dark:text-brand-400';
      case 'brand':
        return 'text-brand-600 dark:text-brand-400';
      case 'expense':
        return '';
      default:
        return 'text-ink-primary dark:text-white';
    }
  };

  return (
    // One panel with hairline dividers instead of six floating cards.
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-surface-hairline dark:bg-surface-dark-hairline border border-surface-hairline dark:border-surface-dark-hairline rounded-container overflow-hidden">
      {cards.map((card) => (
        <div key={card.label} className="bg-white dark:bg-surface-dark-card p-4 min-w-0">
          <p className="eyebrow mb-1.5">{card.label}</p>
          <p className={`min-w-0 [overflow-wrap:anywhere] font-semibold tabular-nums tracking-tight text-xl leading-tight ${card.tone === 'expense' ? 'text-expense' : toneClass(card.tone)}`}>
            {formatValue(card.value, card.format)}
          </p>
          {card.prevValue !== null && (
            <div className="mt-1.5">
              {card.neutralDelta
                ? <span className="text-xs text-ink-muted dark:text-white tabular-nums">{t('reports.prevCount', { count: card.prevValue })}</span>
                : <ChangeIndicator current={card.value} previous={card.prevValue} goodWhenUp={card.goodWhenUp !== false} />}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
