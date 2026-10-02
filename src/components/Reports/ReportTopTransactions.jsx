import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import { translateCategoryName } from '../../utils/categoryTranslation';
import { formatDate } from '../../utils/date';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

export default function ReportTopTransactions({ transactions }) {
  const { t, i18n } = useTranslation();
  const { format: fmt } = useDisplayCurrency();
  // Rows are ranked on base_amount (EUR), so format through the display helper.
  const formatAmount = (amount) => fmt(Math.abs(amount));

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
        <p className="text-sm text-ink-muted dark:text-white text-center py-4">{emptyMsg}</p>
      );
    }
    return (
      <ul className="-mx-4 sm:-mx-5 divide-y divide-surface-hairline dark:divide-surface-dark-hairline border-t border-surface-hairline dark:border-surface-dark-hairline">
        {items.map((tx, idx) => {
          const catName = tx.categories?.name || tx.category?.name;
          const meta = [
            tx.date ? formatDate(new Date(`${tx.date.slice(0, 10)}T00:00:00`), i18n.language) : null,
            catName ? translateCategoryName(catName) : null,
          ].filter(Boolean).join(' · ');
          return (
            <li key={tx.id || idx} className="flex items-center gap-3 px-4 sm:px-5 py-2.5">
              <span className="w-5 text-xs font-medium tabular-nums text-ink-muted dark:text-white">{idx + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink-primary dark:text-white truncate">{tx.title}</p>
                {meta && <p className="mt-0.5 text-xs text-ink-muted dark:text-white truncate">{meta}</p>}
              </div>
              <span
                className={`text-sm font-semibold tabular-nums whitespace-nowrap ${
                  tx.type === 'expense' ? 'text-ink-primary dark:text-white' : 'text-brand-600 dark:text-brand-400'
                }`}
              >
                {tx.type === 'expense' ? '−' : '+'}{formatAmount(tx.base_amount ?? tx.amount ?? 0)}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card padding="md">
        <h3 className="text-heading text-ink-primary dark:text-white mb-3">
          {t('reports.topExpenses')}
        </h3>
        {renderList(topExpenses, t('reports.noExpenses'))}
      </Card>
      <Card padding="md">
        <h3 className="text-heading text-ink-primary dark:text-white mb-3">
          {t('reports.topIncome')}
        </h3>
        {renderList(topIncome, t('reports.noIncome'))}
      </Card>
    </div>
  );
}
