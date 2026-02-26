
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
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
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Re-render when language changes to update translated validation messages
  useEffect(() => {
    // This effect will run whenever language changes
  }, [i18n.language]);

  async function handleGoogleLogin() {
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
    <div className="max-w-md mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border-2 border-green-100 dark:border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4m-5-4l5-5m0 0l-5-5m5 5H3" /></svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-400 dark:to-emerald-400 bg-clip-text text-transparent mb-2">{t('auth.loginTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.signInDescription')}</p>
        </div>
        {/* Google OAuth */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-200 px-4 py-3 rounded-xl font-semibold text-sm shadow-sm hover:shadow transition-all"
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
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
          <span className="text-xs text-gray-400 dark:text-gray-500 font-medium">OR</span>
          <div className="flex-1 h-px bg-gray-200 dark:bg-gray-600"></div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">{t('auth.email')}</label>
            <input
              type="text"
              value={email}
              onChange={e => {
                setEmail(e.target.value);
                if (emailError) setEmailError('');
              }}
              placeholder={t('auth.emailPlaceholder')}
              className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${emailError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {emailError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(emailError)}</span>}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('auth.passwordPlaceholder')}
                className={`w-full border-2 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
              />
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-600 dark:text-gray-400 dark:hover:text-green-400 focus:outline-none transition-colors"
                aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                )}
              </button>
            </div>
            {passwordError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(passwordError)}</span>}
            <div className="flex items-center justify-between mt-4">
              <label className="flex items-center gap-2 cursor-pointer select-none ml-1">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={e => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-green-600 focus:ring-green-500 dark:bg-gray-700 cursor-pointer"
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">{t('auth.rememberMe')}</span>
              </label>
              <Link to="/forgot-password" className="text-xs text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-semibold transition-colors">
                {t('auth.forgotPassword')}
              </Link>
            </div>
          </div>

          {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-center text-sm p-3 rounded-xl font-medium">{t(formError)}</div>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-4 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            disabled={loading}
          >
            {t('auth.signIn')}
          </button>
        </form>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="text-green-600 dark:text-green-400 font-bold hover:underline transition-colors">{t('auth.createAccount')}</Link>
        </div>
      </div>
    </div>
  );
}
