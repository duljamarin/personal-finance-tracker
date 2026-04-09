import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';

function formatAmount(amount) {
  return `€${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function ChangeIndicator({ current, previous }) {
  const { t } = useTranslation();
  if (previous === 0 && current === 0) return null;

  if (previous === 0) {
    return (
      <span className="text-xs text-gray-400 dark:text-gray-500">
        {t('reports.vsLastPeriod')}
      </span>
    );
  }

  const diff = current - previous;
  const pct = ((diff / previous) * 100).toFixed(1);
  const isUp = diff > 0;

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${isUp ? 'text-brand-600 dark:text-brand-400' : 'text-red-500 dark:text-red-400'}`}>
      {isUp ? (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
      ) : (
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      )}
      {isUp ? '+' : '-'}{Math.abs(pct)}% {t('reports.vsLastPeriod')}
    </span>
  );
}

export default function ReportSummaryCards({ transactions, prevTransactions, startDate, endDate }) {
  const { t } = useTranslation();

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

  // Savings rate
  const savingsRate = curr.income > 0 ? ((curr.net / curr.income) * 100) : 0;
  const prevSavingsRate = prev.income > 0 ? ((prev.net / prev.income) * 100) : 0;

  // Days in period for avg daily spend
  const start = new Date(startDate + 'T00:00:00');
  const end = new Date(endDate + 'T00:00:00');
  const days = Math.max(1, Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1);
  const avgDailySpend = curr.expenses / days;

  const cards = [
    {
      label: t('reports.totalIncome'),
      value: curr.income,
      prevValue: prev.income,
      colorClass: 'text-brand-600 dark:text-brand-400',
      format: 'currency',
    },
    {
      label: t('reports.totalExpenses'),
      value: curr.expenses,
      prevValue: prev.expenses,
      colorClass: 'text-red-600 dark:text-red-400',
      format: 'currency',
    },
    {
      label: t('reports.netSavings'),
      value: curr.net,
      prevValue: prev.net,
      colorClass: curr.net >= 0
        ? 'text-blue-600 dark:text-blue-400'
        : 'text-amber-600 dark:text-amber-400',
      format: 'currency',
    },
    {
      label: t('reports.savingsRate'),
      value: savingsRate,
      prevValue: prevSavingsRate,
      colorClass: savingsRate >= 20
        ? 'text-brand-600 dark:text-brand-400'
        : savingsRate >= 0
          ? 'text-amber-600 dark:text-amber-400'
          : 'text-red-600 dark:text-red-400',
      format: 'percent',
    },
    {
      label: t('reports.transactionCount'),
      value: transactions.length,
      prevValue: prevTransactions.length,
      colorClass: 'text-gray-800 dark:text-gray-200',
      format: 'number',
    },
    {
      label: t('reports.avgDailySpend'),
      value: avgDailySpend,
      prevValue: null,
      colorClass: 'text-gray-800 dark:text-gray-200',
      format: 'currency',
    },
  ];

  const formatValue = (val, format) => {
    if (format === 'percent') return `${val.toFixed(1)}%`;
    if (format === 'number') return val.toString();
    return `${val < 0 ? '-' : ''}${formatAmount(val)}`;
  };

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      {cards.map((card) => (
        <Card key={card.label}>
          <div className="p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{card.label}</p>
            <p className={`text-lg font-bold ${card.colorClass}`}>
              {formatValue(card.value, card.format)}
            </p>
            {card.prevValue !== null && (
              <div className="mt-1">
                <ChangeIndicator current={card.value} previous={card.prevValue} />
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}
