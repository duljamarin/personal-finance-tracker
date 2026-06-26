import { useTranslation } from 'react-i18next';

export default function FirstRunGuide({ onAddTransaction }) {
  const { t } = useTranslation();

  return (
    <div className="mt-6 animate-in">
      {/* Hero empty state */}
      <div className="rounded-container border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden">
        <div className="px-8 py-12 text-center max-w-lg mx-auto">
          {/* Illustration */}
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-brand-50 dark:bg-brand-950/30 flex items-center justify-center">
                <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="24" cy="24" r="18" className="stroke-brand-300 dark:stroke-brand-700" />
                  <path d="M24 14v10l6 4" className="stroke-brand-500" strokeWidth="2" />
                  <path d="M16 36 L24 30 L32 36" className="stroke-brand-400 dark:stroke-brand-600" />
                </svg>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-md bg-brand-600 flex items-center justify-center shadow-sm shadow-brand-500/30">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            </div>
          </div>

          <h2 className="text-2xl font-semibold text-ink-primary dark:text-white tracking-tight mb-3">
            {t('dashboard.firstRun.title')}
          </h2>
          <p className="text-base text-ink-muted dark:text-white leading-relaxed mb-8">
            {t('dashboard.firstRun.subtitle')}
          </p>

          <button
            onClick={onAddTransaction}
            className="inline-flex items-center gap-2.5 px-6 py-3.5 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-md transition-all shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30 active:scale-[0.98] text-base"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            {t('dashboard.firstRun.cta')}
          </button>

          <p className="mt-4 text-sm text-ink-muted/70 dark:text-white/70">
            {t('dashboard.firstRun.hint')}
          </p>
        </div>

        {/* 3-step guide row */}
        <div className="border-t border-surface-hairline dark:border-surface-dark-hairline bg-surface-page dark:bg-surface-dark-page px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto">
            {[
              { step: '1', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />, titleKey: 'dashboard.firstRun.step1Title', descKey: 'dashboard.firstRun.step1Desc' },
              { step: '2', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />, titleKey: 'dashboard.firstRun.step2Title', descKey: 'dashboard.firstRun.step2Desc' },
              { step: '3', icon: <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />, titleKey: 'dashboard.firstRun.step3Title', descKey: 'dashboard.firstRun.step3Desc' },
            ].map(({ step, icon, titleKey, descKey }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300 flex items-center justify-center text-xs font-bold tabular-nums">{step}</span>
                <div>
                  <p className="text-sm font-semibold text-ink-primary dark:text-white mb-0.5">{t(titleKey)}</p>
                  <p className="text-xs text-ink-muted dark:text-white leading-relaxed">{t(descKey)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
