import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';
import { dataDelay, delayStyle, rowDelay } from '../../utils/motion';
import { formatMonthName, formatMonthShort } from '../../utils/date';

/**
 * Kept per month (spec 4.1, row 3): income minus spending for the last six
 * months as rounded vertical bars; the selected month is the brand bar. The
 * header carries the selected month's savings rate (moved here from the old
 * summary strip). A month that spent more than it earned has no bar height;
 * its value stays readable in the screen-reader list.
 */
export default function KeptPerMonthTile({ series, totals, monthRef, index = 5, className = '' }) {
  const { t, i18n } = useTranslation();
  const { format } = useDisplayCurrency();
  const delay = dataDelay(index);
  const max = Math.max(0, ...series.map((m) => m.kept));
  const rate = totals.income > 0 ? Math.round(((totals.income - totals.expense) / totals.income) * 100) : null;
  const month = formatMonthName(monthRef, i18n.language);

  return (
    <Card index={index} className={`flex flex-col min-h-[240px] ${className}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-h3 font-bold text-fg">{t('dashboard.keptPerMonth')}</h2>
        <span className="text-sm font-bold text-brand-text tabular-nums" title={t('dashboard.savingsRateNote')}>
          {rate === null ? t('dashboard.noIncomeYet') : t('dashboard.keptIn', { pct: rate, month })}
        </span>
      </div>
      <div className="flex-1 min-h-[150px] mt-gap flex items-end gap-2.5" role="img" aria-label={t('dashboard.keptChart', { count: series.length })}>
        {series.map((m, i) => {
          const selected = i === series.length - 1;
          const h = max > 0 ? (Math.max(0, m.kept) / max) * 100 : 0;
          return (
            <div key={m.key} className="flex-1 h-full flex flex-col justify-end items-center gap-1.5 min-w-0">
              <div className="w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-bar origin-bottom animate-grow-y bar-h"
                  style={{
                    height: `${h}%`,
                    backgroundColor: selected ? 'var(--brand-text)' : 'var(--inner-2)',
                    ...delayStyle(rowDelay(i, delay)),
                  }}
                />
              </div>
              <span className="text-sm font-bold text-fg" aria-hidden="true">{formatMonthShort(m.date, i18n.language)}</span>
            </div>
          );
        })}
      </div>
      <ul className="sr-only">
        {series.map((m) => (
          <li key={m.key}>{formatMonthName(m.date, i18n.language)}: {format(m.kept)}</li>
        ))}
      </ul>
    </Card>
  );
}
