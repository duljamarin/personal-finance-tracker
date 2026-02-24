import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { supabase } from '../../utils/supabaseClient';
import Card from '../UI/Card.jsx';

export default function AccountPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { addToast } = useToast();

  // --- Display Name ---
  const [displayName, setDisplayName] = useState(user?.user_metadata?.username || '');
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
    </div>
  );
}
