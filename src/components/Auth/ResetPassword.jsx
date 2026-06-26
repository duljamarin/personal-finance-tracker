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
        const params = new URLSearchParams(window.location.search);
        const tokenHash = params.get('token_hash');
        const type = params.get('type');

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
            window.history.replaceState({}, '', '/reset-password');
            return;
          }
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          setIsValidSession(true);
        } else {
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
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      addToast(t('auth.passwordResetSuccess'), 'success');
      await supabase.auth.signOut();
      navigate('/login');
    } catch (err) {
      console.error('Reset password error:', err);
      const errorMsg = err?.message || '';
      let errorKey = 'auth.resetPasswordError';
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
        <div className="w-12 h-12 border-4 border-surface-hairline dark:border-surface-dark-hairline border-t-brand-600 rounded-full animate-spin mb-4" />
        <p className="text-ink-muted dark:text-white font-medium">{t('auth.verifying')}</p>
      </div>
    );
  }

  if (!isValidSession) {
    return null;
  }

  const pwInputClass = (hasError) =>
    `w-full border py-3 px-3.5 pr-10 text-base focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-white dark:bg-surface-dark-card text-ink-primary dark:text-white placeholder:text-ink-muted/40 dark:placeholder:text-white/40 rounded-md transition-colors ${hasError ? 'border-expense' : 'border-surface-hairline dark:border-surface-dark-hairline hover:border-ink-muted/40 dark:hover:border-ink-dark-muted/40'}`;

  return (
    <div className="relative min-h-[85vh] flex items-center justify-center px-4 py-12 overflow-hidden">
      <div aria-hidden="true" className="absolute top-6 left-6 sm:top-10 sm:left-10 w-20 h-20 border-t border-l border-brand-500/30 rounded-tl-xl pointer-events-none" />
      <div aria-hidden="true" className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-20 h-20 border-b border-r border-brand-500/30 rounded-br-xl pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-600 rounded-md mb-5 shadow-lg shadow-brand-500/30">
            <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 17 L10 11 L14 14 L20 6" />
              <path d="M15 6 L20 6 L20 11" />
            </svg>
          </div>
          <h1 className="text-4xl sm:text-5xl font-semibold text-ink-primary dark:text-white tracking-tight leading-[1.05] mb-3">
            {t('auth.resetPasswordTitle')}
          </h1>
          <p className="text-base text-ink-muted dark:text-white max-w-sm mx-auto">
            {t('auth.resetPasswordDescription')}
          </p>
        </div>

        <div className="bg-white dark:bg-surface-dark-card rounded-container border border-surface-hairline dark:border-surface-dark-hairline p-7 sm:p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-ink-primary dark:text-white mb-2">
                {t('auth.newPassword')}
              </label>
              <PasswordInput
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError('');
                }}
                placeholder={t('auth.passwordPlaceholder')}
                className={pwInputClass(passwordError)}
              />
              {passwordError && <span className="text-expense text-xs mt-2 block">{t(passwordError)}</span>}
            </div>

            <div>
              <label className="block text-sm font-medium text-ink-primary dark:text-white mb-2">
                {t('auth.confirmNewPassword')}
              </label>
              <PasswordInput
                value={confirmPassword}
                onChange={e => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError) setConfirmPasswordError('');
                }}
                placeholder={t('auth.confirmPasswordPlaceholder')}
                className={pwInputClass(confirmPasswordError)}
              />
              {confirmPasswordError && <span className="text-expense text-xs mt-2 block">{t(confirmPasswordError)}</span>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 px-4 rounded-md transition-all disabled:opacity-50 disabled:cursor-not-allowed text-base shadow-md shadow-brand-500/20 hover:shadow-lg hover:shadow-brand-500/30"
            >
              {loading ? t('auth.resetting') : t('auth.resetPassword')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
