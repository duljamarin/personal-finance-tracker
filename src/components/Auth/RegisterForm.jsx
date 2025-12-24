import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';

export default function RegisterForm() {
  const { register, loading, accessToken, clearError } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [language, setLanguage] = useState(i18n.language || 'en');

  // Redirect to dashboard if already logged in
  useEffect(() => {
    if (accessToken) {
      navigate('/', { replace: true });
    }
  }, [accessToken, navigate]);
  
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Clear field errors when language changes
  }, [i18n.language]);

  // Auto-hide success message after 2 seconds with fade effect
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  function validate() {
    let valid = true;
    setEmailError('');
    setUsernameError('');
    setPasswordError('');
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
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
    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessMessage('');
    if (!validate()) return;
    try {
      const result = await register(email, username, password, language);
      
      // Check if email confirmation is required
      if (result.session) {
        // Logged in immediately - redirect to home
        navigate('/');
      } else {
        // Email confirmation required - show success message then redirect
        setSuccessMessage('auth.confirmEmail');
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      // Check if this is the email confirmation message (expected flow, not an error)
      console.error('Signup error from Supabase:', err?.message);
      const errorMsg = err?.message || '';
      if (errorMsg.toLowerCase().includes('check your email') || errorMsg.toLowerCase().includes('confirm')) {
        // This is the expected email confirmation flow - show success message then redirect
        clearError();
        setSuccessMessage('auth.confirmEmail');
        setTimeout(() => navigate('/login'), 2500);
        return;
      }
      
      // Map common Supabase errors to translation keys (store key, not translated message)
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
    <div className="max-w-md mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border-2 border-blue-100 dark:border-gray-700">
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent mb-2">{t('auth.registerTitle')}</h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">{t('auth.joinDescription')}</p>
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
              className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${emailError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {emailError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(emailError)}</span>}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">{t('auth.username')}</label>
            <input
              type="text"
              value={username}
              onChange={e => {
                setUsername(e.target.value);
                if (usernameError) setUsernameError('');
              }}
              placeholder={t('auth.usernamePlaceholder')}
              className={`w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${usernameError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-600'}`}
            />
            {usernameError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(usernameError)}</span>}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">{t('auth.preferredLanguage')}</label>
            <select
              value={language}
              onChange={e => setLanguage(e.target.value)}
              className="w-full border-2 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 transition-all shadow-sm border-gray-200 dark:border-gray-600"
            >
              <option value="en">{t('languages.english', 'English')}</option>
              <option value="sq">{t('languages.albanian', 'Shqip (Albanian)')}</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">{t('auth.password')}</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                id="password"
                autoComplete="new-password"
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('auth.passwordPlaceholder')}
                className={`w-full border-2 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-gray-700'}`}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400 focus:outline-none transition-colors"
                onClick={() => setShowPassword((prev) => !prev)}
                tabIndex={-1}
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
          </div>

          {formError && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-center text-sm p-3 rounded-xl font-medium">{t(formError)}</div>}

          {successMessage && <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 text-center text-sm p-3 rounded-xl font-medium animate-fade-out">{t(successMessage)}</div>}

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-4 py-3.5 rounded-xl font-bold text-base shadow-lg hover:shadow-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            disabled={loading}
          >
            {t('auth.createAccount')}
          </button>
        </form>
        <div className="text-center text-sm text-gray-600 dark:text-gray-400 pt-2 border-t border-gray-200 dark:border-gray-700">
          {t('auth.hasAccount')}{' '}
          <Link to="/login" className="text-blue-600 dark:text-blue-400 font-bold hover:underline transition-colors">{t('auth.signIn')}</Link>
        </div>
      </div>
    </div>
  );
}
