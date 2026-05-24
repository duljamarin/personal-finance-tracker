import { useTranslation } from 'react-i18next';

const KeepIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" strokeLinecap="round" strokeLinejoin="round">
    <rect width="40" height="40" rx="10" fill="#22ad93" fillOpacity="0.12" />
    <path d="M12 20.5l5.5 5.5 10.5-11" stroke="#22ad93" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DiscardIcon = () => (
  <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10" strokeLinecap="round" strokeLinejoin="round">
    <rect width="40" height="40" rx="10" className="fill-surface-hairline dark:fill-surface-dark-hairline" />
    <path d="M14 20h12M20 14l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function DemoDataStep({ choice, onChoice }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-5">
      <div>
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-brand-600/10 dark:bg-brand-600/20 text-brand-700 dark:text-brand-300 text-[11px] font-semibold uppercase tracking-[0.12em] mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
          {t('onboarding.demoData.badge')}
        </div>
        <h2 className="text-2xl font-semibold text-ink-primary dark:text-white tracking-tight leading-tight mb-2">
          {t('onboarding.demoData.title')}
        </h2>
        <p className="text-sm text-ink-muted dark:text-white/60 leading-relaxed">
          {t('onboarding.demoData.subtitle')}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 pt-1">
        {/* Keep card */}
        <button
          type="button"
          onClick={() => onChoice('keep')}
          className={`group relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
            choice === 'keep'
              ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-md shadow-brand-600/10'
              : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-brand-500/50 dark:hover:border-brand-600/50 bg-white dark:bg-surface-dark-card'
          }`}
        >
          {choice === 'keep' && (
            <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center">
              <svg className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <KeepIcon />
          <p className="mt-3 text-sm font-semibold text-ink-primary dark:text-white leading-tight">
            {t('onboarding.demoData.keepLabel')}
          </p>
          <p className="mt-1 text-xs text-ink-muted dark:text-white/50 leading-snug">
            {t('onboarding.demoData.keepHint')}
          </p>
        </button>

        {/* Discard card */}
        <button
          type="button"
          onClick={() => onChoice('discard')}
          className={`group relative text-left p-4 rounded-xl border-2 transition-all duration-150 ${
            choice === 'discard'
              ? 'border-brand-600 bg-brand-50 dark:bg-brand-950/40 shadow-md shadow-brand-600/10'
              : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-brand-500/50 dark:hover:border-brand-600/50 bg-white dark:bg-surface-dark-card'
          }`}
        >
          {choice === 'discard' && (
            <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-brand-600 flex items-center justify-center">
              <svg className="w-2.5 h-2.5" fill="none" stroke="white" strokeWidth={3} viewBox="0 0 12 12">
                <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          )}
          <DiscardIcon />
          <p className="mt-3 text-sm font-semibold text-ink-primary dark:text-white leading-tight">
            {t('onboarding.demoData.discardLabel')}
          </p>
          <p className="mt-1 text-xs text-ink-muted dark:text-white/50 leading-snug">
            {t('onboarding.demoData.discardHint')}
          </p>
        </button>
      </div>

      <p className="text-xs text-ink-muted dark:text-white/40 pt-1">
        {t('onboarding.demoData.note')}
      </p>
    </div>
  );
}
