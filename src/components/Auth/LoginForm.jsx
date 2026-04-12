
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import PasswordInput from '../UI/PasswordInput';
export default function LoginForm() {
  const { login, loading, accessToken } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (accessToken) {
      navigate('/', { replace: true });
    }
  }, [accessToken, navigate]);

  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Re-render when language changes to update translated validation messages
  useEffect(() => {
    // This effect will run whenever language changes
  }, [i18n.language]);

  async function handleGoogleLogin() {
    // OAuth is an explicit trusted sign-in - always treat as "remembered"
    localStorage.setItem('rememberMe', 'true');
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/dashboard' },
    });
  }

  function validate() {
    let valid = true;
    setEmailError('');
    setPasswordError('');

    // Trim email and validate with stricter regex matching Supabase requirements
    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError('auth.emailError');
      valid = false;
    }
    if (!password || password.length < 6) {
      setPasswordError('auth.passwordError');
      valid = false;
    }
    return valid;
  }
          // ...existing code...
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;
    try {
      // Trim email before sending to Supabase
      await login(email.trim(), password, rememberMe);
      navigate('/');
    } catch (err) {
      // Map common Supabase errors to translation keys
      // Map common Supabase errors to translation keys (store key, not translated message)
      let errorKey = 'auth.loginError';
      const errorMsg = err?.message || '';

      if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('credentials')) {
        errorKey = 'auth.invalidCredentials';
      } else if (errorMsg.toLowerCase().includes('not found')) {
        errorKey = 'auth.userNotFound';
      } else if (errorMsg.toLowerCase().includes('too many')) {
        errorKey = 'auth.tooManyRequests';
      }
      setFormError(errorKey);
    }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm lg:max-w-md xl:max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{t('auth.loginTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('auth.signInDescription')}</p>
        </div>

        {/* Card */}
        <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl border border-gray-200 dark:border-zinc-800 p-6">
          {/* Google OAuth */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-surface-dark-elevated border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-surface-dark-tertiary text-gray-700 dark:text-gray-200 px-4 py-2.5 rounded-lg font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.continueWithGoogle')}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700"></div>
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium uppercase">or</span>
            <div className="flex-1 h-px bg-gray-200 dark:bg-zinc-700"></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.email')}</label>
              <input
                type="text"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError('');
                }}
                placeholder={t('auth.emailPlaceholder')}
                className={`w-full border rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-elevated text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors ${emailError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-zinc-700'}`}
              />
              {emailError && <span className="text-red-500 text-xs mt-1.5 block">{t(emailError)}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('auth.password')}</label>
              <PasswordInput
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('auth.passwordPlaceholder')}
                className={`w-full border rounded-lg px-3.5 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-elevated text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-colors ${passwordError ? 'border-red-300 dark:border-red-700' : 'border-gray-200 dark:border-zinc-700'}`}
              />
              {passwordError && <span className="text-red-500 text-xs mt-1.5 block">{t(passwordError)}</span>}
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-zinc-600 text-brand-600 focus:ring-brand-500 dark:bg-surface-dark-elevated cursor-pointer"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">{t('auth.rememberMe')}</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 font-medium transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>

            {formError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-center text-sm p-3 rounded-lg">
                {t(formError)}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              disabled={loading}
            >
              {t('auth.signIn')}
            </button>
          </form>
        </div>

        {/* Footer link */}
        <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-6">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">{t('auth.createAccount')}</Link>
        </p>
      </div>
    </div>
  );
}
