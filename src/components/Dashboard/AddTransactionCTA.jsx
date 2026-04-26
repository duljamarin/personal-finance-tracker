import { useTranslation } from 'react-i18next';

export default function AddTransactionCTA({ onClick }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="group relative w-full h-full min-h-[140px] rounded-[10px] border border-brand-200 dark:border-brand-900/50 bg-gradient-to-br from-brand-50 to-brand-100/60 dark:from-brand-950/20 dark:to-brand-950/40 hover:border-brand-400 dark:hover:border-brand-700 hover:from-brand-50 hover:to-brand-100/80 dark:hover:to-brand-950/60 transition-all flex flex-col items-center justify-center gap-3 px-6 py-5 overflow-hidden"
    >
      {/* Decorative corner dot pattern */}
      <div aria-hidden="true" className="absolute top-0 right-0 w-24 h-24 opacity-[0.06] dark:opacity-[0.04]">
        <svg viewBox="0 0 96 96" className="w-full h-full">
          {[0,1,2,3].map(row => [0,1,2,3].map(col => (
            <circle key={`${row}-${col}`} cx={col*24+12} cy={row*24+12} r="2" fill="#168b78" />
          )))}
        </svg>
      </div>

      <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-xl bg-brand-600 text-white shadow-md shadow-brand-500/30 group-hover:shadow-lg group-hover:shadow-brand-500/40 group-hover:scale-105 transition-all duration-150">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="relative text-base font-semibold text-ink-primary dark:text-ink-dark-primary tracking-tight font-display">
        {t('dashboard.addTransaction')}
      </span>
      <span className="relative text-sm text-brand-700 dark:text-brand-300 text-center max-w-[260px] font-medium">
        {t('dashboard.addTransactionHint')}
      </span>
    </button>
  );
}
