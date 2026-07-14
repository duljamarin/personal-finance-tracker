import { useTranslation } from 'react-i18next';

export default function AddTransactionCTA({ onClick }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="group relative w-full h-full min-h-[140px] rounded-[10px] border border-transparent bg-brand-600 hover:bg-brand-700 transition-colors flex flex-col items-center justify-center gap-3 px-6 py-5 overflow-hidden"
    >
      <span className="relative inline-flex items-center justify-center w-12 h-12 rounded-md bg-white/15 text-white group-hover:scale-105 transition-transform duration-150">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </span>
      <span className="relative text-base font-semibold text-white tracking-tight">
        {t('dashboard.addTransaction')}
      </span>
      <span className="relative text-sm text-white/75 text-center max-w-[260px] font-medium">
        {t('dashboard.addTransactionHint')}
      </span>
    </button>
  );
}
