import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import PasswordInput from '../UI/PasswordInput';
import Input from '../UI/Input';
import { trackEvent } from '../../lib/analytics';

export default function RegisterForm() {
  const { register, loading, accessToken, clearError } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const redirectTimerRef = useRef(null);
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en');

  useEffect(() => {
    if (accessToken) {
      navigate('/', { replace: true });
    }
  }, [accessToken, navigate]);

  useEffect(() => {
    return () => clearTimeout(redirectTimerRef.current);
  }, []);

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [termsError, setTermsError] = useState('');

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  async function handleGoogleLogin() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/dashboard',
        queryParams: { prompt: 'select_account' },
      },
    });
  }

  function validate() {
    let valid = true;
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
    setTermsError('');

    const trimmedEmail = email.trim();
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
      setEmailError('auth.emailError');
      valid = false;
    }
    if (!username || username.length < 3) {
      setUsernameError('auth.usernameError');
      valid = false;
    }
    if (!password || password.length < 6) {
      setPasswordError('auth.passwordError');
      valid = false;
    }
    if (!agreeTerms) {
      setTermsError('auth.termsError');
      valid = false;
    }
    return valid;
  }

  function scheduleLoginRedirect() {
    setSuccessMessage('auth.confirmEmail');
    redirectTimerRef.current = setTimeout(() => navigate('/login'), 2500);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    if (!validate()) return;
    try {
      const result = await register(email.trim(), username, password, language);

      if (result.session) {
        trackEvent('Signup');
        navigate('/');
      } else {
        trackEvent('Signup');
        scheduleLoginRedirect();
      }
    } catch (err) {
      console.error('Signup error from Supabase:', err?.message);
      const errorMsg = err?.message || '';
      if (errorMsg.toLowerCase().includes('check your email') || errorMsg.toLowerCase().includes('confirm')) {
        clearError();
        scheduleLoginRedirect();
        return;
      }

      let errorKey = 'auth.registrationError';
      if (errorMsg.toLowerCase().includes('already') || errorMsg.toLowerCase().includes('exists')) {
        errorKey = 'auth.registrationError';
      } else if (errorMsg.toLowerCase().includes('weak') || errorMsg.toLowerCase().includes('password')) {
        errorKey = 'auth.weakPassword';
      } else if (errorMsg.toLowerCase().includes('too many')) {
        errorKey = 'auth.tooManyRequests';
      }
      setFormError(errorKey);
    }
  }

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div aria-hidden="true" className="absolute top-6 left-6 sm:top-10 sm:left-10 w-20 h-20 border-t border-l border-brand-500/30 rounded-tl-xl pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-20 h-20 border-b border-r border-brand-500/30 rounded-br-xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-md mb-5 shadow-lg shadow-brand-500/30">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 L10 11 L14 14 L20 6" />
              <path d="M15 6 L20 6 L20 11" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-ink-primary dark:text-white tracking-tight leading-[1.05] mb-3">
            {t('auth.registerTitle')}
          </h1>
          <p className="text-base text-ink-muted dark:text-white max-w-sm mx-auto">
            {t('auth.joinDescription')}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark-card rounded-xl border border-surface-hairline dark:border-surface-dark-hairline p-7 sm:p-8 shadow-sm">
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white dark:bg-surface-dark-elevated border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 text-ink-primary dark:text-white px-4 py-3 rounded-md font-medium text-sm transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 flex-shrink-0" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('auth.continueWithGoogle')}
          </button>

          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-surface-hairline dark:bg-surface-dark-hairline" />
            <span className="text-xs text-ink-muted dark:text-white/60 font-medium">{t('auth.or')}</span>
            <div className="flex-1 h-px bg-surface-hairline dark:bg-surface-dark-hairline" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label={t('auth.email')}
              type="text"
              value={email}
              onChange={e => { setEmail(e.target.value); if (emailError) setEmailError(''); }}
              placeholder={t('auth.emailPlaceholder')}
              error={emailError ? t(emailError) : ''}
              leadingIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              }
            />

            <Input
              label={t('auth.username')}
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); if (usernameError) setUsernameError(''); }}
              placeholder={t('auth.usernamePlaceholder')}
              error={usernameError ? t(usernameError) : ''}
              leadingIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              }
            />

            <div>
              <label className="block text-sm font-medium text-ink-primary dark:text-white mb-2">{t('auth.preferredLanguage')}</label>
              <select
                value={language}
                onChange={e => setLanguage(e.target.value)}
                className="w-full border border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40 rounded-md px-3.5 py-3 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white transition-colors"
              >
                <option value="en">{t('languages.english', 'English')}</option>
                <option value="sq">{t('languages.albanian', 'Shqip (Albanian)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-primary dark:text-white mb-2">{t('auth.password')}</label>
              <PasswordInput
                name="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={e => { setPassword(e.target.value); if (passwordError) setPasswordError(''); }}
                placeholder={t('auth.passwordPlaceholder')}
                error={!!passwordError}
                leadingIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                }
              />
              {passwordError && (
                <p className="mt-2 text-xs text-expense flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                  {t(passwordError)}
                </p>
              )}
            </div>

            <div>
              <label className="flex items-start gap-2.5 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={agreeTerms}
                  onChange={e => { setAgreeTerms(e.target.checked); if (termsError) setTermsError(''); }}
                  className="peer sr-only"
                />
                <span className="mt-0.5 w-[18px] h-[18px] rounded-[5px] border-[1.5px] border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card flex items-center justify-center transition-colors group-hover:border-brand-500/50 peer-checked:bg-brand-600 peer-checked:border-brand-600 peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500/30 flex-shrink-0">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: agreeTerms ? 1 : 0 }}>
                    <path d="M4.5 12.75 10.5 18 20 6" />
                  </svg>
                </span>
                <span className="text-sm text-ink-primary dark:text-white leading-relaxed">
                  {t('auth.agreeToTerms')}{' '}
                  <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">{t('auth.termsOfService')}</Link>
                  {' '}{t('auth.andThe')}{' '}
                  <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">{t('auth.privacyPolicy')}</Link>
                </span>
              </label>
              {termsError && <span className="text-expense text-xs mt-2 block">{t(termsError)}</span>}
            </div>

            {formError && (
              <div className="bg-expense-bg border border-expense/30 text-expense text-center text-sm p-3 rounded-md">
                {t(formError)}
              </div>
            )}

            {successMessage && (
              <div className="bg-brand-50 dark:bg-brand-950/30 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 text-center text-sm p-3 rounded-md animate-fade-out">
                {t(successMessage)}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
              disabled={loading}
            >
              {t('auth.createAccount')}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-ink-muted dark:text-white mt-8">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-brand-600 dark:text-brand-400 font-medium hover:underline">{t('auth.signIn')}</Link>
        </p>
      </div>
    </div>
  );
}
