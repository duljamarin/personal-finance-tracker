import { useTranslation } from 'react-i18next';
import { useCrypto } from '../../context/CryptoContext';

// Non-blocking progress indicator while existing data is being encrypted (or
// decrypted, on reversal) in the background. Interruption is always safe —
// the banner simply reappears next session and resumes from where it left off.
export default function MigrationBanner() {
  const { t } = useTranslation();
  const { isMigrating, migrationProgress, keysRow } = useCrypto();

  if (!isMigrating) return null;

  const reversing = keysRow?.encryption_status === 'disabling';
  const label = migrationProgress?.table
    ? t('encryption.migrationTableLabel', { table: migrationProgress.table })
    : '';

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs w-full sm:w-80 bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline rounded-container shadow-tier2 px-4 py-3 flex items-center gap-3 animate-fade-in">
      <div className="w-5 h-5 flex-shrink-0 border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin" />
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink-primary dark:text-white truncate">
          {reversing ? t('encryption.migrationReversingTitle') : t('encryption.migrationTitle')}
        </p>
        {label && (
          <p className="text-xs text-ink-muted dark:text-white/60 truncate">{label}</p>
        )}
      </div>
    </div>
  );
}
