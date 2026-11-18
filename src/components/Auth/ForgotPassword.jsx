import { useState } from 'react';
import AuthLayout from './AuthLayout';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { localizedPath } from '../../lib/tools';
import Input from '../UI/Input';

// Defined outside the component: when it lived inside ForgotPassword(), a new
// Shell function identity was created on every render, and React treats a
// changed component identity as a different element type — unmounting and
// remounting everything inside it (including the email <Input>) on every
// keystroke, which dropped focus after each character typed.
const Shell = ({ children }) => (
  <AuthLayout>{children}</AuthLayout>
);

export default function ForgotPassword() {
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  function validate() {
    setEmailError('');
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
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: redirectUrl });
      if (error) throw error;
      setSuccess(true);
    } catch (err) {
      console.error('Reset password error:', err);
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <Shell>
        <div className="tile p-tile-dense sm:p-tile text-center">
          <div className="w-16 h-16 bg-brand-600 rounded-full flex items-center justify-center mx-auto mb-5">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
            </svg>
          </div>
          <h1 className="text-h1 font-extrabold text-fg mb-3">
            {t('auth.checkYourEmail')}
          </h1>
          <p className="text-base text-fg mb-8">
            {t('auth.resetEmailSent')}
          </p>
          <Link
            to={localizedPath('/login', i18n.language)}
            className="inline-flex items-center gap-2 text-brand-text hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {t('auth.backToLogin')}
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-icon mb-5">
          <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 17 L10 11 L14 14 L20 6" />
            <path d="M15 6 L20 6 L20 11" />
          </svg>
        </div>
        <h1 className="text-h1 font-extrabold text-fg mb-3">
          {t('auth.forgotPasswordTitle')}
        </h1>
        <p className="text-base text-fg max-w-sm mx-auto">
          {t('auth.forgotPasswordDescription')}
        </p>
      </div>

      <div className="tile p-tile-dense sm:p-tile">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label={t('auth.email')}
            type="text"
            value={email}
            onChange={e => {
              setEmail(e.target.value);
              if (emailError) setEmailError('');
            }}
            placeholder={t('auth.emailPlaceholder')}
            error={emailError ? t(emailError) : ''}
            leadingIcon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            }
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-input transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-base"
          >
            {loading ? t('auth.sending') : t('auth.sendResetLink')}
          </button>

          <div className="text-center">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 text-brand-text hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              {t('auth.backToLogin')}
            </Link>
          </div>
        </form>
      </div>
    </Shell>
  );
}
