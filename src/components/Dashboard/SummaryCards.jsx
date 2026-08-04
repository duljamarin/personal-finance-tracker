import { useTranslation } from 'react-i18next';
import { useDisplayCurrency } from '../../hooks/useDisplayCurrency';

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

export default function SummaryCards({ totalIncome, totalExpense, net, loading }) {
  const { t } = useTranslation();
  // Single currency: the caption below names which one, so the figures are
  // never ambiguous.
  const { format: formatCurrency, currency } = useDisplayCurrency();

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
    if (tone === 'expense' || tone === 'negative') return 'text-expense dark:text-expense';
    return 'text-ink-primary dark:text-white';
  };
  const iconTone = (tone) => {
    if (tone === 'income' || tone === 'positive') return 'text-brand-600 dark:text-brand-400';
    if (tone === 'expense' || tone === 'negative') return 'text-expense dark:text-expense';
    return 'text-ink-muted dark:text-white/70';
  };
  const borderTone = (tone) => {
    if (tone === 'income' || tone === 'positive') return 'border-l-2 border-l-brand-600';
    if (tone === 'negative' || tone === 'expense') return 'border-l-2 border-l-expense';
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
            <div className="flex items-center gap-2 mb-4">
              <span className={iconTone(card.tone)}>{card.icon}</span>
              <p className="eyebrow text-[10px]">{card.label}</p>
            </div>
            {showSkeleton ? (
              <div className="h-9 bg-surface-hairline dark:bg-surface-dark-hairline rounded-md w-2/3 animate-pulse" />
            ) : (
              <p className={`min-w-0 [overflow-wrap:anywhere] text-3xl sm:text-4xl font-semibold tabular-nums tracking-tight leading-none ${valueTone(card.tone)}`}>
                {formatCurrency(card.value)}
              </p>
            )}
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-ink-muted dark:text-white/70">
        {t('currency.baseCurrency', { currency })}
      </p>
    </>
  );
}
