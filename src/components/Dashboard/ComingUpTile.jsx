import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import Card from '../UI/Card';
import Skeleton from '../UI/Skeleton';
import { fetchRecurringTransactions } from '../../utils/api';
import { useAsyncData } from '../../hooks/useAsyncData';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { formatMonthShort } from '../../utils/date';
import { signed } from '../../utils/bento';
import { delayStyle, rowDelay, dataDelay } from '../../utils/motion';
import { upcomingRecurring } from '../../utils/finance/dashboardModel';

/** Coming up (spec 4.1, row 3): next three active recurring rules by next run. */
export default function ComingUpTile({ reloadTrigger, index = 6, className = '' }) {
  const { t, i18n } = useTranslation();
  const { format } = useDisplayCurrency();
  const { data, loading } = useAsyncData(() => fetchRecurringTransactions(), [reloadTrigger], []);
  const items = upcomingRecurring(data);
  const base = dataDelay(index);

  const when = (days) => {
    if (days === 0) return t('transactions.today');
    if (days === 1) return t('dashboard.tomorrow');
    return t('dashboard.inDays', { count: days });
  };

  return (
    <Card index={index} className={`min-h-[240px] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 font-bold text-fg">{t('dashboard.comingUp')}</h2>
        <Link to="/recurring" className="group inline-flex items-center gap-1.5 text-sm font-bold text-brand-text">
          {t('recurring.badge')}
          <ArrowRight className="arrow-nudge w-4 h-4" strokeWidth={2.4} aria-hidden="true" />
        </Link>
      </div>
      {loading && items.length === 0 ? (
        <div className="mt-3.5 space-y-2.5">{[0, 1, 2].map((i) => <Skeleton key={i} className="!h-14 !rounded-icon" />)}</div>
      ) : items.length === 0 ? (
        <p className="mt-3 text-base font-semibold text-fg">{t('dashboard.noUpcoming')}</p>
      ) : (
        <ul className="mt-3.5 flex flex-col gap-2.5">
          {items.map((r, i) => {
            const [y, m, d] = String(r.next_run_at).slice(0, 10).split('-').map(Number);
            const date = new Date(y, m - 1, d);
            const income = r.type === 'income';
            return (
              <li key={r.id} className="activity-row animate-rise flex items-center gap-[14px] p-2 rounded-icon" style={delayStyle(rowDelay(i, base))}>
                <span className="w-14 h-14 shrink-0 rounded-icon bg-inner flex flex-col items-center justify-center leading-tight text-fg" aria-hidden="true">
                  <span className="text-[20px] font-extrabold tabular-nums">{d}</span>
                  <span className="text-min font-bold">{formatMonthShort(date, i18n.language)}</span>
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-extrabold text-fg truncate">{r.title}</p>
                  <p className="text-sm font-semibold text-fg">{when(r.inDays)}</p>
                </div>
                <span className={`font-extrabold tabular-nums whitespace-nowrap ${income ? 'text-brand-text' : 'text-fg'}`}>
                  {signed(format(Number(r.amount) || 0), income)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
