import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';

// Shown instead of the "Continue with Google" button when the page is
// opened inside an in-app WebView (Instagram, Facebook, LinkedIn, TikTok,
// etc.) — Google blocks OAuth from these with "Error 403:
// disallowed_useragent" and there's no way around it from our side. The
// only fix is opening the page in a real browser, so we guide the user
// there instead of letting them hit Google's dead-end error page.
export default function InAppBrowserWarning() {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [copied, setCopied] = useState(false);

  function handleCopyLink() {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      addToast(t('auth.linkCopied'), 'success');
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div className="border border-warning/40 bg-warning-bg dark:bg-warning/15 rounded-md p-4 flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <svg className="w-5 h-5 flex-shrink-0 text-warning mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <div>
          <p className="text-sm font-semibold text-ink-primary dark:text-white">
            {t('auth.inAppBrowserTitle')}
          </p>
          <p className="text-sm text-ink-secondary dark:text-white/80 mt-1">
            {t('auth.inAppBrowserDesc')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleCopyLink}
        className="w-full bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 text-ink-primary dark:text-white px-4 py-2.5 rounded-md font-medium text-sm transition-colors"
      >
        {copied ? t('auth.linkCopied') : t('auth.copyLinkToOpenInBrowser')}
      </button>
    </div>
  );
}
