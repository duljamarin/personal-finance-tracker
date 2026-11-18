import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import CategoryAvatar from '../UI/CategoryAvatar';
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
        <p className="tile-inner text-base font-semibold text-fg text-center py-6">{emptyMsg}</p>
      );
    }
    return (
      <ul className="flex flex-col gap-1">
        {items.map((tx, idx) => {
          const catName = tx.categories?.name || tx.category?.name;
          const meta = [
            tx.date ? formatDate(new Date(`${tx.date.slice(0, 10)}T00:00:00`), i18n.language) : null,
            catName ? translateCategoryName(catName) : null,
          ].filter(Boolean).join(' · ');
          return (
            <li key={tx.id || idx} className={`activity-row flex items-center gap-3 px-2 py-2.5 rounded-icon ${tx.type === 'income' ? 'bg-inner' : ''}`}>
              <span className="activity-icon shrink-0">
                <CategoryAvatar category={tx.categories || tx.category} fallbackName={tx.title} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-fg truncate">{tx.title}</p>
                {meta && <p className="mt-0.5 text-sm font-semibold text-fg truncate">{meta}</p>}
              </div>
              <span
                className={`text-h3 font-extrabold tabular-nums whitespace-nowrap ${
                  tx.type === 'expense' ? 'text-fg' : 'text-brand-text'
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
    <div className="grid grid-cols-1 md:grid-cols-2 gap-gap">
      <Card padding="sm">
        <h2 className="text-h3 font-bold text-fg mb-3 px-2">
          {t('reports.topExpenses')}
        </h2>
        {renderList(topExpenses, t('reports.noExpenses'))}
      </Card>
      <Card padding="sm">
        <h2 className="text-h3 font-bold text-fg mb-3 px-2">
          {t('reports.topIncome')}
        </h2>
        {renderList(topIncome, t('reports.noIncome'))}
      </Card>
    </div>
  );
}
