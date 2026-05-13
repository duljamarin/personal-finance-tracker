import { useTranslation } from 'react-i18next';
import { formatCurrency } from '../../utils/formatCurrency';

const TrendUp = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 17 L9 11 L13 14 L21 6" /><path d="M14 6 L21 6 L21 13" />
  </svg>
);
const TrendDown = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7 L9 13 L13 10 L21 18" /><path d="M14 18 L21 18 L21 11" />
  </svg>
);
const ScalesIcon = (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3v18M5 7h14M3 11l2-4 2 4M17 11l2-4 2 4M3 11a2 2 0 0 0 4 0M17 11a2 2 0 0 0 4 0" />
  </svg>
);

export default function SummaryCards({ totalIncome, totalExpense, net, hasMixedCurrencies, loading }) {
  const { t } = useTranslation();

  const cards = [
    {
      label: t('dashboard.totalIncome'),
      value: totalIncome,
      tone: 'income',
      icon: TrendUp,
    },
    {
      label: t('dashboard.totalExpenses'),
      value: totalExpense,
      tone: 'expense',
      icon: TrendDown,
    },
    {
      label: t('dashboard.balance'),
      value: net,
      tone: net >= 0 ? 'positive' : 'negative',
      icon: ScalesIcon,
    },
  ];

  const showSkeleton = loading && totalIncome === 0 && totalExpense === 0;

  const valueTone = (tone) => {
    if (tone === 'income') return 'text-brand-600 dark:text-brand-400';
    if (tone === 'positive') return 'text-ink-primary dark:text-white';
    if (tone === 'expense' || tone === 'negative') return 'text-[#e8394d] dark:text-[#e8394d]';
    return 'text-ink-primary dark:text-white';
  };
  const iconTone = (tone) => {
    if (tone === 'income' || tone === 'positive') return 'bg-brand-50 text-brand-600 dark:bg-brand-950/40 dark:text-brand-400';
    if (tone === 'expense' || tone === 'negative') return 'bg-rose-50 text-[#e8394d] dark:bg-rose-950/20 dark:text-[#e8394d]';
    return 'bg-surface-page text-ink-muted dark:bg-surface-dark-page dark:text-white';
  };
  const borderTone = (tone) => {
    if (tone === 'income' || tone === 'positive') return 'border-l-2 border-l-brand-500';
    if (tone === 'negative' || tone === 'expense') return 'border-l-2 border-l-[#e8394d]';
    return 'border-l-2 border-l-surface-hairline';
  };

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`relative bg-white dark:bg-surface-dark-card rounded-[10px] p-6 border border-surface-hairline dark:border-surface-dark-hairline ${borderTone(card.tone)}`}
          >
            <div className="flex items-start justify-between mb-4">
              <p className="eyebrow text-[10px]">{card.label}</p>
              <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md ${iconTone(card.tone)}`}>
                {card.icon}
              </span>
            </div>
            {showSkeleton ? (
              <div className="h-9 bg-surface-hairline dark:bg-surface-dark-hairline rounded-md w-2/3 animate-pulse" />
            ) : (
              <p className={`text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight leading-none ${valueTone(card.tone)}`}>
                {formatCurrency(card.value)}
              </p>
            )}
            <p className="text-xs mt-3 text-ink-muted dark:text-white">{t('currency.baseCurrency')}</p>
          </div>
        ))}
      </div>

      {hasMixedCurrencies && (
        <div className="mt-4 p-3 bg-brand-50/60 dark:bg-brand-950/20 border border-brand-200/60 dark:border-brand-800/30 rounded-md flex items-center gap-2.5 text-sm text-brand-700 dark:text-brand-300">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{t('currency.mixedCurrencies')}</span>
        </div>
      )}
    </>
  );
}
