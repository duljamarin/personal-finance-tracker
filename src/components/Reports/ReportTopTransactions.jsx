import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';

function formatAmount(amount) {
  return `€${Math.abs(amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function ReportTopTransactions({ transactions }) {
  const { t } = useTranslation();

  const { topExpenses, topIncome } = useMemo(() => {
    const expenses = transactions
      .filter(tx => tx.type === 'expense')
      .sort((a, b) => (b.base_amount ?? b.amount ?? 0) - (a.base_amount ?? a.amount ?? 0))
      .slice(0, 5);

    const income = transactions
      .filter(tx => tx.type === 'income')
      .sort((a, b) => (b.base_amount ?? b.amount ?? 0) - (a.base_amount ?? a.amount ?? 0))
      .slice(0, 5);

    return { topExpenses: expenses, topIncome: income };
  }, [transactions]);

  const renderList = (items, emptyMsg) => {
    if (items.length === 0) {
      return (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">{emptyMsg}</p>
      );
    }
    return (
      <div className="space-y-2">
        {items.map((tx, idx) => (
          <div
            key={tx.id || idx}
            className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50"
          >
            <div className="flex-1 min-w-0 mr-3">
              <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                {tx.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {(tx.date || '').slice(0, 10)}
                </span>
                {(tx.categories?.name || tx.category?.name) && (
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    {tx.categories?.name || tx.category?.name}
                  </span>
                )}
              </div>
            </div>
            <span className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
              tx.type === 'expense'
                ? 'text-red-600 dark:text-red-400'
                : 'text-brand-600 dark:text-brand-400'
            }`}>
              {tx.type === 'expense' ? '-' : '+'}{formatAmount(tx.base_amount ?? tx.amount ?? 0)}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t('reports.topExpenses')}
        </h3>
        {renderList(topExpenses, t('reports.noExpenses'))}
      </Card>
      <Card padding="md">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
          {t('reports.topIncome')}
        </h3>
        {renderList(topIncome, t('reports.noIncome'))}
      </Card>
    </div>
  );
}
