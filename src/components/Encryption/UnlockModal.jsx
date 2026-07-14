import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../UI/Modal';
import Button from '../UI/Button';
import PasswordInput from '../UI/PasswordInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCrypto } from '../../context/CryptoContext';
import {
  unlockWithPasswordManual,
  unlockWithRecoveryCode,
  resetWithNewKey,
} from '../../utils/crypto/keyLifecycle';

// Shown when the keyring is 'locked': a restored session with no cached key
// (private browsing, cleared storage, different browser) or a password that
// changed elsewhere. Offers password unlock first, recovery code as a
// fallback, and a last-resort "lost my code" reset.
//
// For OAuth users, "password" here means their standalone app password
// (see EncryptionSettings) — labeled accordingly so it isn't mistaken for
// their Google account credentials.
export default function UnlockModal({ onUnlocked, onSetupNewKey }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user } = useAuth();
  const { keysRow } = useCrypto();
  const userId = user?.id;
  const isAppPassword = !!keysRow?.is_app_password;
  const [mode, setMode] = useState('password'); // 'password' | 'recovery' | 'lost'
  const [password, setPassword] = useState('');
  const [recoveryCode, setRecoveryCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handlePasswordUnlock(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await unlockWithPasswordManual(password);
      addToast(t('encryption.unlocked'), 'success');
      onUnlocked();
    } catch {
      setError(t(isAppPassword ? 'encryption.incorrectAppPassword' : 'encryption.incorrectPassword'));
    } finally {
      setBusy(false);
    }
  }

  async function handleRecoveryUnlock(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await unlockWithRecoveryCode(recoveryCode);
      addToast(t('encryption.unlocked'), 'success');
      onUnlocked();
    } catch {
      setError(t('encryption.incorrectRecoveryCode'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal onClose={() => {}}>
      <div className="flex flex-col gap-4">
        <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white">
          {t('encryption.unlockTitle')}
        </h2>
        <p className="text-sm text-ink-muted dark:text-white/70">
          {t('encryption.unlockDesc')}
        </p>

        {mode === 'password' && (
          <form onSubmit={handlePasswordUnlock} className="flex flex-col gap-3">
            <PasswordInput
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isAppPassword ? t('encryption.enterAppPassword') : t('encryption.enterPassword')}
              autoComplete="current-password"
              className="w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline"
            />
            {error && <p className="text-sm text-expense">{error}</p>}
            <Button type="submit" disabled={busy || !password}>
              {busy ? t('encryption.unlocking') : t('encryption.unlock')}
            </Button>
            <button
              type="button"
              onClick={() => { setMode('recovery'); setError(''); }}
              className="text-sm text-ink-muted dark:text-white/70 hover:text-brand-600 dark:hover:text-brand-500 underline text-center"
            >
              {t('encryption.useRecoveryCodeInstead')}
            </button>
          </form>
        )}

        {mode === 'recovery' && (
          <form onSubmit={handleRecoveryUnlock} className="flex flex-col gap-3">
            <input
              type="text"
              value={recoveryCode}
              onChange={(e) => setRecoveryCode(e.target.value)}
              placeholder={t('encryption.enterRecoveryCode')}
              className="w-full border rounded-md px-4 py-3 font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline"
            />
            {error && <p className="text-sm text-expense">{error}</p>}
            <Button type="submit" disabled={busy || !recoveryCode}>
              {busy ? t('encryption.unlocking') : t('encryption.unlock')}
            </Button>
            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={() => { setMode('password'); setError(''); }}
                className="text-ink-muted dark:text-white/70 hover:text-brand-600 dark:hover:text-brand-500 underline"
              >
                {t('common.back')}
              </button>
              <button
                type="button"
                onClick={() => { setMode('lost'); setError(''); }}
                className="text-ink-muted dark:text-white/70 hover:text-expense underline"
              >
                {t('encryption.lostRecoveryCode')}
              </button>
            </div>
          </form>
        )}

        {mode === 'lost' && (
          <LostCodeConfirm
            busy={busy}
            isAppPassword={isAppPassword}
            onBack={() => setMode('recovery')}
            onConfirm={async (newPassword) => {
              setBusy(true);
              try {
                const { recoveryCode: newCode } = await resetWithNewKey(userId, newPassword);
                onSetupNewKey(newCode);
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </div>
    </Modal>
  );
}

function LostCodeConfirm({ onBack, onConfirm, busy, isAppPassword }) {
  const { t } = useTranslation();
  const [ack, setAck] = useState(false);
  const [password, setPassword] = useState('');

  return (
    <div className="flex flex-col gap-3">
      <div className="border border-expense rounded-md p-3 bg-expense-bg text-sm text-expense">
        {t('encryption.lostRecoveryCodeWarning')}
      </div>
      <label className="flex items-start gap-2 text-sm text-ink-secondary dark:text-white cursor-pointer">
        <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-0.5" />
        {t('encryption.lostRecoveryCodeAck')}
      </label>
      {ack && (
        <PasswordInput
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={isAppPassword ? t('encryption.createAppPassword') : t('encryption.enterPassword')}
          autoComplete={isAppPassword ? 'new-password' : 'current-password'}
          className="w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline"
        />
      )}
      <Button
        variant="danger"
        disabled={!ack || !password || busy}
        onClick={() => onConfirm(password)}
      >
        {t('encryption.continueWithNewKey')}
      </Button>
      <button type="button" onClick={onBack} className="text-sm text-ink-muted dark:text-white/70 hover:text-brand-600 underline text-center">
        {t('common.back')}
      </button>
    </div>
  );
}
