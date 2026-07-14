import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useCrypto } from '../../context/CryptoContext';

const E2EE_ENABLED = import.meta.env.VITE_E2EE_ENABLED === 'true';
const DISMISS_KEY = 'e2ee_prompt_dismissed';

// Catches everyone who ends up without encryption despite the flag being on:
// OAuth users (Google redirects straight to /dashboard, skipping
// RegisterForm's auto-setup), email/password users whose Supabase project
// has email confirmation enabled (RegisterForm never gets a session to set
// up encryption with, and the subsequent first login doesn't trigger setup
// either — see AuthContext.login/unlockWithPassword), and any pre-existing
// user from before the flag was turned on. Soft, dismissible nudge shown
// once on the dashboard; can still be enabled later via My Profile.
export default function EncryptionPromptBanner() {
  const { t } = useTranslation();
  const { isEncryptionEnabled, status, refreshKeysRow } = useCrypto();
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    // CryptoContext's keysRow can go stale if encryption was set up while
    // navigated away to My Profile — force a fresh read whenever this
    // banner mounts (e.g. navigating back to the dashboard) rather than
    // relying solely on the migration-effect's own refresh.
    refreshKeysRow();
  }, [refreshKeysRow]);

  if (!E2EE_ENABLED || dismissed) return null;
  if (status === 'loading' || isEncryptionEnabled) return null;

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setDismissed(true);
  }

  return (
    <div className="mb-6 rounded-container bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline border-l-2 border-l-brand-600 dark:border-l-brand-400 p-5 flex items-center gap-4">
      <div className="w-10 h-10 flex-shrink-0 bg-brand-600 rounded-md flex items-center justify-center">
        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold tracking-tight text-sm text-ink-primary dark:text-white mb-0.5">
          {t('encryption.promptTitle')}
        </h3>
        <p className="text-sm text-ink-muted dark:text-white/70">
          {t('encryption.promptDesc')}
        </p>
      </div>
      <Link
        to="/account"
        className="flex-shrink-0 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
      >
        {t('encryption.promptCta')}
      </Link>
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 rounded-md text-ink-muted dark:text-white hover:bg-white/60 dark:hover:bg-surface-dark-card/60 transition-colors"
        aria-label={t('common.cancel')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}
