import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../utils/supabaseClient';
import { deleteUserAccount } from '../../utils/api.js';
import Card from '../UI/Card.jsx';

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
    } catch {
      addToast(t('account.passwordError'), 'error');
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
      <h1 className="text-2xl font-extrabold text-gray-900 dark:text-white">{t('account.title')}</h1>

      {/* Display Name Section */}
      <Card padding="lg" className="border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('account.displayName')}</h2>
        <form onSubmit={handleSaveName} className="flex flex-col gap-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('account.displayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              placeholder={t('account.displayNamePlaceholder')}
              className="w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm border-gray-200 dark:border-gray-600"
            />
          </div>
          <button
            type="submit"
            disabled={savingName || !displayName.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingName ? t('account.saving') : t('account.saveDisplayName')}
          </button>
        </form>
      </Card>

      {/* Change Password Section */}
      <Card padding="lg" className="border border-gray-100 dark:border-gray-700">
        <h2 className="text-lg font-bold text-gray-800 dark:text-white mb-4">{t('account.changePassword')}</h2>
        <form onSubmit={handleSavePassword} className="flex flex-col gap-4">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('account.newPassword')}
            </label>
            <input
              type="password"
              value={newPassword}
              onChange={e => {
                setNewPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('account.newPasswordPlaceholder')}
              autoComplete="new-password"
              className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
          </div>
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('account.confirmPassword')}
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('account.confirmPasswordPlaceholder')}
              autoComplete="new-password"
              className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
          </div>
          {passwordError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm p-3 rounded-xl font-medium">
              {t(passwordError)}
            </div>
          )}
          <button
            type="submit"
            disabled={savingPassword || !newPassword || !confirmPassword}
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {savingPassword ? t('account.saving') : t('account.savePassword')}
          </button>
        </form>
      </Card>

      {/* Danger Zone */}
      <div className="border-2 border-red-200 dark:border-red-800 rounded-2xl overflow-hidden">
        <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 flex items-center gap-3 border-b border-red-200 dark:border-red-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
          </svg>
          <h2 className="text-lg font-bold text-red-700 dark:text-red-400">{t('account.dangerZone')}</h2>
        </div>
        <div className="bg-white dark:bg-gray-800 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">{t('account.deleteAccountTitle')}</p>
            <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">{t('account.deleteAccountDesc')}</p>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="flex-shrink-0 px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-bold rounded-xl shadow-sm hover:shadow-md transition-all"
          >
            {t('account.deleteAccountBtn')}
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t('account.deleteModalTitle')}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('account.deleteModalDesc')}</p>
              </div>
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4">
              <ul className="text-sm text-amber-800 dark:text-amber-300 space-y-1 list-disc list-inside">
                <li>{t('account.deleteWarn1')}</li>
                <li>{t('account.deleteWarn2')}</li>
                <li>{t('account.deleteWarn3')}</li>
              </ul>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                {t('account.deleteConfirmLabel')}
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm border-gray-200 dark:border-gray-600 font-mono tracking-widest"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => { setShowDeleteModal(false); setDeleteConfirmText(''); }}
                disabled={deleting}
                className="flex-1 px-4 py-3 border-2 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-sm shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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
