import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../utils/supabaseClient';
import { deleteUserAccount } from '../../utils/api.js';
import Card from '../UI/Card.jsx';
import PasswordInput from '../UI/PasswordInput';

export default function AccountPage() {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  // --- Display Name ---
  const emailLocalPart = user?.email ? user.email.split('@')[0] : '';
  const [displayName, setDisplayName] = useState(user?.user_metadata?.username || emailLocalPart);
  const [savingName, setSavingName] = useState(false);

  async function handleSaveName(e) {
    e.preventDefault();
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({ data: { username: displayName.trim() } });
      if (error) throw error;
      localStorage.setItem('username', displayName.trim());
      addToast(t('account.displayNameUpdated'), 'success');
    } catch {
      addToast(t('account.displayNameError'), 'error');
    } finally {
      setSavingName(false);
    }
  }

  // --- Change Password ---
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSavePassword(e) {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 6) {
      setPasswordError('account.passwordTooShort');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('account.passwordMismatch');
      return;
    }

    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setNewPassword('');
      setConfirmPassword('');
      addToast(t('account.passwordUpdated'), 'success');
    } catch (err) {
      const msg = err?.message?.toLowerCase() || '';
      if (msg.includes('same') || msg.includes('different') || msg.includes('already')) {
        setPasswordError('auth.passwordSameAsOld');
      } else {
        addToast(t('account.passwordError'), 'error');
      }
    } finally {
      setSavingPassword(false);
    }
  }

  // --- Delete Account ---
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDeleteAccount() {
    if (deleteConfirmText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteUserAccount();
      await logout();
      navigate('/');
      addToast(t('account.deleteSuccess'), 'success');
    } catch {
      addToast(t('account.deleteError'), 'error');
      setDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmText('');
    }
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4 flex flex-col gap-6">
      <h1 className="font-semibold tracking-tight text-2xl text-ink-primary dark:text-white">{t('account.title')}</h1>

      {/* Display Name Section */}
      <Card padding="lg" className="border border-surface-hairline dark:border-surface-dark-hairline">
        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
          <div>
            <label className="block font-semibold text-ink-secondary dark:text-white mb-2 text-sm">
              {t('account.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('account.displayNamePlaceholder')}
              className="w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline"
            />
          </div>
          <button
            type="submit"
            disabled={savingName || !displayName.trim()}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingName ? t('account.saving') : t('account.saveDisplayName')}
          </button>
        </form>
      </Card>

      {/* Change Password Section */}
      <Card padding="lg" className="border border-surface-hairline dark:border-surface-dark-hairline">
        <h2 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white mb-4">{t('account.changePassword')}</h2>
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div>
            <label className="block font-semibold text-ink-secondary dark:text-white mb-2 text-sm">
              {t('account.newPassword')}
            </label>
            <PasswordInput
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('account.newPasswordPlaceholder')}
              autoComplete="new-password"
              show={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              className={`w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all ${passwordError ? 'border-expense' : 'border-surface-hairline dark:border-surface-dark-hairline'}`}
            />
          </div>
          <div>
            <label className="block font-semibold text-ink-secondary dark:text-white mb-2 text-sm">
              {t('account.confirmPassword')}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('account.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              show={showPassword}
              onToggle={() => setShowPassword(v => !v)}
              className={`w-full border rounded-md px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all ${passwordError ? 'border-expense' : 'border-surface-hairline dark:border-surface-dark-hairline'}`}
            />
          </div>
          {passwordError && (
            <div className="border border-expense text-expense dark:text-expense text-sm p-3 rounded-md font-medium">
              {t(passwordError)}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white px-4 py-3 rounded-md font-semibold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {savingPassword ? t('account.saving') : t('account.savePassword')}
          </button>
        </form>
      </Card>

      {/* Danger Zone */}
      <div className="border border-expense rounded-container overflow-hidden">
        <div className="px-6 py-4 flex items-center gap-3 border-b border-expense bg-expense-bg">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0 text-expense" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h2 className="font-semibold tracking-tight text-lg text-expense">{t('account.dangerZone')}</h2>
        </div>
        <div className="bg-white dark:bg-surface-dark-card px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-semibold text-ink-primary dark:text-white text-sm">{t('account.deleteAccountTitle')}</p>
            <p className="text-ink-muted dark:text-white text-xs mt-1">{t('account.deleteAccountDesc')}</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-shrink-0 px-5 py-2.5 text-white text-sm font-bold rounded-md shadow-sm transition-colors bg-danger hover:bg-danger-hover"
          >
            {t('account.deleteAccountBtn')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white dark:bg-surface-dark-card rounded-container shadow-tier2 max-w-md w-full p-6 flex flex-col gap-5 border border-surface-hairline dark:border-surface-dark-hairline">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 bg-expense-tint">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-expense" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold tracking-tight text-lg text-ink-primary dark:text-white">{t('account.deleteModalTitle')}</h3>
                <p className="text-sm text-ink-muted dark:text-white mt-1">{t('account.deleteModalDesc')}</p>
              </div>
            </div>

            <div className="border border-surface-hairline dark:border-surface-dark-hairline rounded-md p-4 bg-surface-subtle dark:bg-surface-dark-subtle">
              <ul className="text-sm text-ink-secondary dark:text-white space-y-1 list-disc list-inside">
                <li>{t('account.deleteWarn1')}</li>
                <li>{t('account.deleteWarn2')}</li>
                <li>{t('account.deleteWarn3')}</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink-secondary dark:text-white mb-2">
                {t('account.deleteConfirmLabel')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full border rounded-md px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 transition-all border-surface-hairline dark:border-surface-dark-hairline font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                disabled={deleting}
                className="flex-1 px-4 py-3 border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white rounded-md font-bold text-sm hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle transition-all disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-3 text-white rounded-md font-bold text-sm shadow-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-danger hover:bg-danger-hover"
              >
                {deleting ? t('account.deleting') : t('account.deleteAccountBtn')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
