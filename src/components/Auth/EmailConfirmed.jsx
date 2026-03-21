import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../utils/supabaseClient';

export default function EmailConfirmed() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'error'

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const type = searchParams.get('type');

    if (!tokenHash || !type) {
      setStatus('error');
      return;
    }

    const verify = async () => {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type,
      });

      if (error) {
        console.error('Email verification failed', error);
        setStatus('error');
      } else {
        console.log('Email verified, session:', data?.session);
        setStatus('success');
        // Redirect to dashboard after a short delay on success
        setTimeout(() => {
          navigate('/dashboard');
        }, 3000);
      }
    };

    verify();
  }, [navigate, searchParams]);

  const isLoading = status === 'verifying';
  const isError = status === 'error';

  return (
    <div className="max-w-md mx-auto mt-8 sm:mt-12 lg:mt-16 px-4">
      <div className="bg-white dark:bg-surface-dark-tertiary rounded-xl shadow-sm p-6 sm:p-8 flex flex-col gap-5 sm:gap-6 border border-gray-200 dark:border-zinc-800 text-center">
        {isError ? (
          <div className="w-20 h-20 bg-red-500 rounded-full flex items-center justify-center mx-auto shadow-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        ) : (
          <div className="w-20 h-20 bg-brand-50 dark:bg-brand-900/20 rounded-full flex items-center justify-center mx-auto">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-brand-600 dark:text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        )}
        
        <div>
          {isError ? (
            <>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                {t('auth.emailConfirmationFailedTitle', 'Email confirmation failed')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {t('auth.emailConfirmationFailedDescription', 'The confirmation link is invalid or has expired.')}
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
                {t('auth.emailConfirmedTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
                {t('auth.emailConfirmedDescription')}
              </p>
              {isLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {t('auth.verifyingEmail', 'Verifying your email, please wait...')}
                </p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  {t('auth.redirectingToDashboard', 'Redirecting you to your dashboard...')}
                </p>
              )}
            </>
          )}
        </div>

        {!isError && (
          <div className="flex items-center justify-center">
            <div className={`rounded-full h-8 w-8 border-b-2 ${isLoading ? 'animate-spin border-brand-600 dark:border-brand-400' : 'border-transparent'}`}></div>
          </div>
        )}
      </div>
    </div>
  );
}
