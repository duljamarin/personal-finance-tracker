import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useToast } from '../../context/ToastContext';

// Shown after a successful password reset for an account with E2EE enabled.
// The old password-KEK is gone, so the recovery code is the only way to
// re-wrap the DEK under the new password. "Lost it" leads to a destructive
// but explicit fallback that starts fresh encryption (old data becomes
// undecryptable until/unless the code turns up — see keyLifecycle.resetWithNewKey).
export default function RecoveryCodeStep({ onSubmitCode, onLostCode }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [mode, setMode] = useState('enter'); // 'enter' | 'lost'
  const [code, setCode] = useState('');
  const [ack, setAck] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await onSubmitCode(code);
    } catch {
      setError(t('encryption.incorrectRecoveryCode'));
      setBusy(false);
    }
  }

  async function handleLostCode() {
    setBusy(true);
    try {
      await onLostCode();
    } catch {
      addToast(t('encryption.setupError'), 'error');
      setBusy(false);
    }
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-semibold text-ink-primary dark:text-white tracking-tight leading-[1.05] mb-3">
            {t('encryption.resetRecoveryTitle')}
          </h1>
          <p className="text-base text-ink-muted dark:text-white max-w-sm mx-auto">
            {t('encryption.resetRecoveryDesc')}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-7 sm:p-8 shadow-sm">
          {mode === 'enter' ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={t('encryption.enterRecoveryCode')}
                className="w-full border rounded-md px-4 py-3 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline"
              />
              {error && <p className="text-sm text-expense">{error}</p>}
              <button
                type="submit"
                disabled={busy || !code}
                className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {busy ? t('encryption.unlocking') : t('encryption.unlock')}
              </button>
              <button
                type="button"
                onClick={() => setMode('lost')}
                className="w-full text-sm text-ink-muted dark:text-white/70 hover:text-expense underline text-center"
              >
                {t('encryption.lostRecoveryCode')}
              </button>
            </form>
          ) : (
            <div className="space-y-5">
              <div className="border border-expense rounded-md p-3 bg-expense-bg text-sm text-expense">
                {t('encryption.lostRecoveryCodeWarning')}
              </div>
              <label className="flex items-start gap-2 text-sm text-ink-secondary dark:text-white cursor-pointer">
                <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
                {t('encryption.lostRecoveryCodeAck')}
              </label>
              <button
                type="button"
                disabled={!ack || busy}
                onClick={handleLostCode}
                className="w-full bg-danger hover:bg-danger-hover text-white font-medium py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {busy ? t('encryption.disabling') : t('encryption.continueWithNewKey')}
              </button>
              <button
                type="button"
                onClick={() => setMode('enter')}
                className="w-full text-sm text-ink-muted dark:text-white/70 hover:text-brand-600 underline text-center"
              >
                {t('common.back')}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
