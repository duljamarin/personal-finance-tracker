import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../utils/supabaseClient';
import { useToast } from '../../context/ToastContext';
import PasswordInput from '../UI/PasswordInput';

export default function ResetPassword() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function verifyRecoveryToken() {
      try {
        // Extract token_hash and type from URL params
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');

        // If we have token_hash and type=recovery in URL, verify it first
        if (tokenHash && type === 'recovery') {
          const { data, error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: 'recovery',
          });

          if (error) {
            console.error('Error verifying recovery token:', error);
            addToast(t('auth.invalidResetLink'), 'error');
            navigate('/login');
            return;
          }

          if (data.session) {
            setIsValidSession(true);
            setCheckingSession(false);
            // Clean up URL params after successful verification
            window.history.replaceState({}, '', '/reset-password');
            return;
          }
        }

        // If no token_hash in URL, check if user already has a valid recovery session
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
          // No valid session and no token to verify
          addToast(t('auth.invalidResetLink'), 'error');
          navigate('/login');
        }
        setCheckingSession(false);
      } catch (err) {
        console.error('Error in recovery flow:', err);
        addToast(t('auth.invalidResetLink'), 'error');
        navigate('/login');
        setCheckingSession(false);
      }
    }

    verifyRecoveryToken();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsValidSession(true);
        setCheckingSession(false);
      } else if (!session && !checkingSession) {
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, addToast, t]);

  function validate() {
    let valid = true;
    setPasswordError('');
    setConfirmPasswordError('');

    if (!password || password.length < 6) {
      setPasswordError('auth.passwordError');
      valid = false;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('auth.confirmPasswordRequired');
      valid = false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('auth.passwordMismatch');
      valid = false;
    }

    return valid;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) throw error;

      addToast(t('auth.passwordResetSuccess'), 'success');
      
      // Sign out and redirect to login
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMsg = err?.message || '';
      let errorKey = 'auth.resetPasswordError';

      // Check for "same password" or "different password" error messages
      if (errorMsg.toLowerCase().includes('same') || 
          errorMsg.toLowerCase().includes('different') ||
          errorMsg.toLowerCase().includes('old password')) {
        errorKey = 'auth.passwordSameAsOld';
      } else if (errorMsg.toLowerCase().includes('weak') || 
                 errorMsg.toLowerCase().includes('password is too weak')) {
        errorKey = 'auth.weakPassword';
      }

      addToast(t(errorKey), 'error');
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <div className="w-12 h-12 border-4 border-gray-200 dark:border-gray-700 border-t-brand-600 rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400 font-medium">{t('auth.verifying')}</p>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  return (
    <div className="max-w-md lg:max-w-lg xl:max-w-xl mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border border-gray-200 dark:border-zinc-800">
        <div className="text-center">
          <div className="w-16 h-16 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            {t('auth.resetPasswordTitle')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            {t('auth.resetPasswordDescription')}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5">
          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('auth.newPassword')}
            </label>
            <PasswordInput
              value={password}
              onChange={e => {
                setPassword(e.target.value);
                if (passwordError) setPasswordError('');
              }}
              placeholder={t('auth.passwordPlaceholder')}
              className={`w-full border-2 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${
                passwordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-zinc-800'
              }`}
            />
            {passwordError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(passwordError)}</span>}
          </div>

          <div>
            <label className="block font-semibold text-gray-700 dark:text-gray-200 mb-2 text-sm">
              {t('auth.confirmNewPassword')}
            </label>
            <PasswordInput
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                if (confirmPasswordError) setConfirmPasswordError('');
              }}
              placeholder={t('auth.confirmPasswordPlaceholder')}
              className={`w-full border-2 rounded-lg px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 transition-all shadow-sm ${
                confirmPasswordError ? 'border-red-500 dark:border-red-400' : 'border-gray-200 dark:border-zinc-800'
              }`}
            />
            {confirmPasswordError && <span className="text-red-500 text-xs mt-1.5 block font-medium">{t(confirmPasswordError)}</span>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('auth.resetting') : t('auth.resetPassword')}
          </button>
        </form>
      </div>
    </div>
  );
}
