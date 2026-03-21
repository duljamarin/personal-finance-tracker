import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';

export default function ForgotPassword() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate() {
    setEmailError('');
    
    // Trim email and validate with stricter regex matching Supabase requirements
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError('auth.emailError');
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      // Trim email before sending to Supabase
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: redirectUrl
      });

      if (error) throw error;

      // Always show success (don't leak if email exists)
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      // Still show success to avoid email enumeration
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="max-w-md mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border border-gray-200 dark:border-zinc-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-display mb-4">
              {t('auth.checkYourEmail')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              {t('auth.resetEmailSent')}
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('auth.backToLogin')}
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border border-gray-200 dark:border-zinc-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white font-display mb-2">
            {t('auth.forgotPasswordTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('auth.forgotPasswordDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('auth.email')}
            </label>
            <input
              type="text"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder={t('auth.emailPlaceholder')}
              className={`w-full border-2 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${
                emailError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-zinc-800'
              }`}
            />
            {emailError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(emailError)}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.sending') : t('auth.sendResetLink')}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-semibold transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('auth.backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
