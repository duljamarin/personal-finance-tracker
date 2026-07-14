import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../UI/Card';
import Button from '../UI/Button';
import PasswordInput from '../UI/PasswordInput';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useCrypto } from '../../context/CryptoContext';
import {
  startDisablingEncryption,
  rewrapForAppPasswordChange,
  rewrapAfterReset,
  rotateRecoveryCode,
} from '../../utils/crypto/keyLifecycle';
import RecoveryCodeModal from './RecoveryCodeModal';

const inputClass = 'w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-ink-primary/10 dark:focus:ring-white/15 focus:border-ink-muted/50 dark:focus:border-white/40 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline';

// AccountPage section: opt-in setup for existing users, and reversal
// ("Disable encryption") for users who already have it on. Rendered only
// when VITE_E2EE_ENABLED=true (see AccountPage).
//
// OAuth users (Google sign-in) have no password in Supabase Auth, so they
// set a standalone "app password" instead — used only as the encryption
// key-wrapping secret, never checked against Supabase Auth. Unlike
// email/password users, it can't be unwrapped automatically at login
// (AuthContext.login never runs for OAuth), so they'll see UnlockModal
// whenever the cached key is missing (new device, cleared storage).
export default function EncryptionSettings({ userId }) {
  const { t } = useTranslation();
  const { addToast } = useToast();
  const { user } = useAuth();
  const isOAuthUser = user?.app_metadata?.provider !== 'email';
  const {
    isEncryptionEnabled,
    isMigrating,
    status,
    keysRow,
    setupNow,
    pendingRecoveryCode,
    dismissRecoveryCode,
  } = useCrypto();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [enableError, setEnableError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // Security/app-password change (via current secret, OR via recovery code
  // when the current secret is forgotten)
  const [showChangeAppPassword, setShowChangeAppPassword] = useState(false);
  const [changeMode, setChangeMode] = useState('secret'); // 'secret' | 'recoveryCode'
  const [oldAppPassword, setOldAppPassword] = useState('');
  const [changeRecoveryCode, setChangeRecoveryCode] = useState('');
  const [newAppPassword, setNewAppPassword] = useState('');
  const [confirmAppPassword, setConfirmAppPassword] = useState('');
  const [changeError, setChangeError] = useState('');

  // Recovery code regeneration (keeps the current secret, issues a new code)
  const [showRotateRecovery, setShowRotateRecovery] = useState(false);
  const [rotateSecret, setRotateSecret] = useState('');
  const [rotateError, setRotateError] = useState('');
  const [newRecoveryCode, setNewRecoveryCode] = useState(null);

  async function handleEnable(e) {
    e.preventDefault();
    setEnableError('');

    if (isOAuthUser) {
      if (password.length < 8) {
        setEnableError('encryption.appPasswordTooShort');
        return;
      }
      if (password !== confirmPassword) {
        setEnableError('encryption.appPasswordMismatch');
        return;
      }
    }

    setBusy(true);
    try {
      await setupNow(password, { status: 'migrating', isAppPassword: isOAuthUser });
      setPassword('');
      setConfirmPassword('');
    } catch {
      addToast(t('encryption.setupError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function handleChangeAppPassword(e) {
    e.preventDefault();
    setChangeError('');

    if (newAppPassword.length < 8) {
      setChangeError('encryption.appPasswordTooShort');
      return;
    }
    if (newAppPassword !== confirmAppPassword) {
      setChangeError('encryption.appPasswordMismatch');
      return;
    }

    setBusy(true);
    try {
      if (changeMode === 'recoveryCode') {
        await rewrapAfterReset(userId, newAppPassword, changeRecoveryCode);
      } else {
        await rewrapForAppPasswordChange(userId, oldAppPassword, newAppPassword);
      }
      setOldAppPassword('');
      setChangeRecoveryCode('');
      setNewAppPassword('');
      setConfirmAppPassword('');
      setShowChangeAppPassword(false);
      setChangeMode('secret');
      addToast(t('encryption.appPasswordUpdated'), 'success');
    } catch {
      setChangeError(changeMode === 'recoveryCode' ? 'encryption.incorrectRecoveryCode' : 'encryption.appPasswordIncorrect');
    } finally {
      setBusy(false);
    }
  }

  async function handleRotateRecovery(e) {
    e.preventDefault();
    setRotateError('');
    setBusy(true);
    try {
      const { recoveryCode } = await rotateRecoveryCode(userId, rotateSecret);
      setRotateSecret('');
      setShowRotateRecovery(false);
      setNewRecoveryCode(recoveryCode);
    } catch {
      setRotateError(isOAuthUser ? 'encryption.appPasswordIncorrect' : 'encryption.incorrectPassword');
    } finally {
      setBusy(false);
    }
  }

  async function handleDisable() {
    setBusy(true);
    try {
      await startDisablingEncryption(userId);
      addToast(t('encryption.disableStarted'), 'info');
      setShowDisableConfirm(false);
    } catch {
      addToast(t('encryption.disableError'), 'error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card padding="lg" className="border border-surface-hairline dark:border-surface-dark-hairline">
      <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-1">
        {t('encryption.settingsTitle')}
      </h2>
      <p className="text-sm text-ink-muted dark:text-white/70 mb-4">
        {t('encryption.settingsDesc')}
      </p>

      {!isEncryptionEnabled && (
        <form onSubmit={handleEnable} className="flex flex-col gap-3">
          {isOAuthUser && (
            <p className="text-sm text-ink-muted dark:text-white/70">
              {t('encryption.appPasswordExplainer')}
            </p>
          )}
          <PasswordInput
            value={password}
            onChange={(e) => { setPassword(e.target.value); setEnableError(''); }}
            placeholder={isOAuthUser ? t('encryption.createAppPassword') : t('encryption.confirmPasswordToEnable')}
            autoComplete={isOAuthUser ? 'new-password' : 'current-password'}
            className={inputClass}
          />
          {isOAuthUser && (
            <PasswordInput
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); setEnableError(''); }}
              placeholder={t('encryption.confirmAppPassword')}
              autoComplete="new-password"
              className={inputClass}
            />
          )}
          {enableError && <p className="text-sm text-expense">{t(enableError)}</p>}
          <Button type="submit" disabled={busy || !password || (isOAuthUser && !confirmPassword)}>
            {busy ? t('encryption.enabling') : t('encryption.enableButton')}
          </Button>
        </form>
      )}

      {isEncryptionEnabled && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-sm text-brand-600 dark:text-brand-500 font-medium">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            {isMigrating ? t('encryption.statusMigrating') : t('encryption.statusEnabled')}
          </div>
          {status === 'locked' && (
            <p className="text-sm text-expense">{t('encryption.statusLocked')}</p>
          )}

          {keysRow?.is_app_password && !showChangeAppPassword && (
            <Button variant="secondary" onClick={() => setShowChangeAppPassword(true)}>
              {t('encryption.changeAppPasswordButton')}
            </Button>
          )}

          {showChangeAppPassword && (
            <form onSubmit={handleChangeAppPassword} className="flex flex-col gap-3 border border-surface-hairline dark:border-surface-dark-hairline rounded-md p-3">
              {changeMode === 'secret' ? (
                <PasswordInput
                  value={oldAppPassword}
                  onChange={(e) => { setOldAppPassword(e.target.value); setChangeError(''); }}
                  placeholder={t('encryption.currentAppPassword')}
                  autoComplete="current-password"
                  className={inputClass}
                />
              ) : (
                <input
                  type="text"
                  value={changeRecoveryCode}
                  onChange={(e) => { setChangeRecoveryCode(e.target.value); setChangeError(''); }}
                  placeholder={t('encryption.enterRecoveryCode')}
                  className={`${inputClass} font-mono tracking-wider`}
                />
              )}
              <button
                type="button"
                onClick={() => {
                  setChangeMode((m) => (m === 'secret' ? 'recoveryCode' : 'secret'));
                  setChangeError('');
                }}
                className="text-sm text-ink-muted dark:text-white/70 hover:text-brand-600 dark:hover:text-brand-500 underline text-left"
              >
                {changeMode === 'secret'
                  ? t('encryption.forgotSecurityCodeLink')
                  : t('encryption.useSecurityCodeInstead')}
              </button>
              <PasswordInput
                value={newAppPassword}
                onChange={(e) => { setNewAppPassword(e.target.value); setChangeError(''); }}
                placeholder={t('encryption.createAppPassword')}
                autoComplete="new-password"
                className={inputClass}
              />
              <PasswordInput
                value={confirmAppPassword}
                onChange={(e) => { setConfirmAppPassword(e.target.value); setChangeError(''); }}
                placeholder={t('encryption.confirmAppPassword')}
                autoComplete="new-password"
                className={inputClass}
              />
              {changeError && <p className="text-sm text-expense">{t(changeError)}</p>}
              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  className="flex-1"
                  type="button"
                  onClick={() => {
                    setShowChangeAppPassword(false);
                    setChangeMode('secret');
                    setOldAppPassword('');
                    setChangeRecoveryCode('');
                    setChangeError('');
                  }}
                  disabled={busy}
                >
                  {t('common.cancel')}
                </Button>
                <Button
                  className="flex-1"
                  type="submit"
                  disabled={busy || (changeMode === 'secret' ? !oldAppPassword : !changeRecoveryCode) || !newAppPassword}
                >
                  {busy ? t('encryption.enabling') : t('encryption.changeAppPasswordButton')}
                </Button>
              </div>
            </form>
          )}

          {!showRotateRecovery && (
            <Button variant="secondary" onClick={() => setShowRotateRecovery(true)}>
              {t('encryption.rotateRecoveryButton')}
            </Button>
          )}

          {showRotateRecovery && (
            <form onSubmit={handleRotateRecovery} className="flex flex-col gap-3 border border-surface-hairline dark:border-surface-dark-hairline rounded-md p-3">
              <p className="text-sm text-ink-muted dark:text-white/70">
                {t('encryption.rotateRecoveryDesc')}
              </p>
              <PasswordInput
                value={rotateSecret}
                onChange={(e) => { setRotateSecret(e.target.value); setRotateError(''); }}
                placeholder={isOAuthUser ? t('encryption.enterAppPassword') : t('encryption.enterPassword')}
                autoComplete="current-password"
                className={inputClass}
              />
              {rotateError && <p className="text-sm text-expense">{t(rotateError)}</p>}
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" type="button" onClick={() => { setShowRotateRecovery(false); setRotateSecret(''); setRotateError(''); }} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button className="flex-1" type="submit" disabled={busy || !rotateSecret}>
                  {busy ? t('encryption.enabling') : t('encryption.rotateRecoveryButton')}
                </Button>
              </div>
            </form>
          )}

          {!showDisableConfirm ? (
            <Button variant="danger" onClick={() => setShowDisableConfirm(true)}>
              {t('encryption.disableButton')}
            </Button>
          ) : (
            <div className="border border-expense rounded-md p-3 bg-expense-bg flex flex-col gap-3">
              <p className="text-sm text-expense">{t('encryption.disableWarning')}</p>
              <div className="flex gap-2">
                <Button variant="secondary" className="flex-1" onClick={() => setShowDisableConfirm(false)} disabled={busy}>
                  {t('common.cancel')}
                </Button>
                <Button variant="danger" className="flex-1" onClick={handleDisable} disabled={busy}>
                  {busy ? t('encryption.disabling') : t('encryption.confirmDisable')}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {pendingRecoveryCode && (
        <RecoveryCodeModal recoveryCode={pendingRecoveryCode} onDone={dismissRecoveryCode} />
      )}
      {newRecoveryCode && (
        <RecoveryCodeModal
          recoveryCode={newRecoveryCode}
          onDone={() => {
            setNewRecoveryCode(null);
            addToast(t('encryption.recoveryCodeRotated'), 'success');
          }}
        />
      )}
    </Card>
  );
}
