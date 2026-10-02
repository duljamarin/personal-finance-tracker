import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';

// Calm empty state for a brand-new account: one message, one action, then the
// three things the app does once there is data. No icon tile, no badge.
export default function FirstRunGuide({ onAddTransaction }) {
  const { t } = useTranslation();
  const steps = [
    { titleKey: 'dashboard.firstRun.step1Title', descKey: 'dashboard.firstRun.step1Desc' },
    { titleKey: 'dashboard.firstRun.step2Title', descKey: 'dashboard.firstRun.step2Desc' },
    { titleKey: 'dashboard.firstRun.step3Title', descKey: 'dashboard.firstRun.step3Desc' },
  ];

  return (
    <div className="animate-in rounded-container border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden">
      <div className="px-6 sm:px-8 py-8 sm:py-10 max-w-xl">
        <h2 className="font-display text-title text-ink-primary dark:text-white mb-2">
          {t('dashboard.firstRun.title')}
        </h2>
        <p className="text-base text-ink-muted dark:text-white leading-relaxed mb-6">
          {t('dashboard.firstRun.subtitle')}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
          <button
            onClick={onAddTransaction}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-md transition-colors text-sm"
          >
            <Plus className="w-4 h-4" strokeWidth={2} />
            {t('dashboard.firstRun.cta')}
          </button>
          <p className="text-sm text-ink-muted dark:text-white">{t('dashboard.firstRun.hint')}</p>
        </div>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-surface-hairline dark:bg-surface-dark-hairline border-t border-surface-hairline dark:border-surface-dark-hairline list-none m-0 p-0">
        {steps.map(({ titleKey, descKey }, i) => (
          <li key={titleKey} className="bg-surface-page dark:bg-surface-dark-page px-6 sm:px-8 py-5">
            <p className="text-xs font-medium tabular-nums text-ink-muted dark:text-white mb-1.5">{i + 1}</p>
            <p className="text-sm font-medium text-ink-primary dark:text-white mb-1">{t(titleKey)}</p>
            <p className="text-sm text-ink-muted dark:text-white leading-relaxed">{t(descKey)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
