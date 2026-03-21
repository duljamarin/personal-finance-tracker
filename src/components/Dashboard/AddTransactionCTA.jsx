import { useTranslation } from 'react-i18next';

export default function AddTransactionCTA({ onClick }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[120px] rounded-xl border-2 border-dashed border-gray-300 dark:border-zinc-700 hover:border-brand-500 dark:hover:border-brand-500 bg-white dark:bg-surface-dark-tertiary transition-colors flex flex-col items-center justify-center gap-2 group"
    >
      <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/20 flex items-center justify-center text-brand-600 dark:text-brand-400 group-hover:scale-105 transition-transform">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('dashboard.addTransaction')}</span>
      <span className="text-xs text-gray-400 dark:text-gray-500">{t('dashboard.addTransactionHint')}</span>
    </button>
  );
}
