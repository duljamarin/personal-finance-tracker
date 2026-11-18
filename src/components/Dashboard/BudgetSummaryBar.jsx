import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { translateCategoryName } from '../../utils/categoryTranslation';
import Card from '../UI/Card';
import ProgressBar from '../UI/ProgressBar';
import Skeleton from '../UI/Skeleton';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { dataDelay, STAGGER } from '../../utils/motion';

/**
 * Budgets tile (spec 4.1, row 2): one 14px bar per budget of the selected
 * month, "spent / limit" per row and the month total in the header. Data is
 * fetched once by the dashboard (budgets + expenses by category) and shared
 * with the Activity feed.
 */
export default function BudgetSummaryBar({ budgets = [], expenses = {}, loading, monthLabel, maxItems = 5, index = 2, className = '' }) {
  const { t } = useTranslation();
  const { format: formatCurrency } = useDisplayCurrency();
  const delay = dataDelay(index);

  const header = (right) => (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h2 className="text-h3 font-bold text-fg">
        {t('dashboard.budgetProgress')}
        <span className="ml-2 text-sm font-semibold capitalize">{monthLabel}</span>
      </h2>
      {right}
    </div>
  );

  if (loading && budgets.length === 0) {
    return (
      <Card index={index} className={`min-h-[220px] ${className}`}>
        {header(null)}
        <div className="mt-gap space-y-gap">
          {[0, 1, 2].map((i) => <div key={i} className="space-y-2"><Skeleton className="w-1/2" /><Skeleton className="!h-3.5" /></div>)}
        </div>
      </Card>
    );
  }

  if (budgets.length === 0) {
    return (
      <Card index={index} className={`min-h-[220px] ${className}`}>
        {header(
          <Link to="/budgets" className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-text">
            {t('dashboard.setupBudgets')}
            <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
          </Link>,
        )}
        <p className="mt-3 text-base font-semibold text-fg">{t('dashboard.noBudgets')}</p>
      </Card>
    );
  }

  const rows = budgets.map((b) => {
    const limit = Number(b.amount) || 0;
    const spent = Number(expenses[b.category_id]) || 0;
    return { b, limit, spent, ratio: limit > 0 ? spent / limit : 0 };
  });
  const totalSpent = rows.reduce((s, r) => s + r.spent, 0);
  const totalLimit = rows.reduce((s, r) => s + r.limit, 0);

  return (
    <Card index={index} className={`min-h-[220px] ${className}`}>
      {header(
        <span className="text-sm font-bold text-fg tabular-nums">
          {t('dashboard.budgetsTotal', {
            spent: formatCurrency(totalSpent, { decimals: 0 }),
            total: formatCurrency(totalLimit, { decimals: 0 }),
          })}
        </span>,
      )}

      <ul className="mt-gap flex flex-col gap-gap">
        {rows.slice(0, maxItems).map(({ b, limit, spent, ratio }, i) => {
          const pct = Math.round(ratio * 100);
          const over = ratio >= 1;
          return (
            <li key={b.id}>
              <div className="flex items-baseline justify-between gap-3 font-bold text-fg">
                <span className="truncate">{translateCategoryName(b.category?.name || '')}</span>
                <span className="text-sm whitespace-nowrap tabular-nums">
                  {formatCurrency(spent, { decimals: 0 })} / {formatCurrency(limit, { decimals: 0 })}
                  <span className={`ml-1.5 ${over ? 'text-expense font-extrabold' : ''}`}>{pct}%</span>
                </span>
              </div>
              <ProgressBar ratio={ratio} height={14} track="inner" delay={delay + i * STAGGER} className="mt-2" />
            </li>
          );
        })}
      </ul>

      <Link to="/budgets" className="group mt-gap inline-flex items-center gap-1.5 text-sm font-bold text-brand-text">
        {budgets.length > maxItems ? `+${budgets.length - maxItems} ` : ''}{t('dashboard.viewAllBudgets')}
        <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
      </Link>
    </Card>
  );
}
