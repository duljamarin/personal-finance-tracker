import { useTranslation } from 'react-i18next';

export default function AddTransactionCTA({ onClick }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onClick}
      className="w-full h-full min-h-[120px] bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all flex flex-col items-center justify-center gap-2 group"
    >
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
        <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </div>
      <span className="text-lg font-bold">{t('dashboard.addTransaction')}</span>
      <span className="text-sm text-white/80">{t('dashboard.addTransactionHint')}</span>
    </button>
  );
}
