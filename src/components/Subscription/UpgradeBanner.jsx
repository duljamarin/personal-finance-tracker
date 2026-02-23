import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { APP_CONFIG } from '../../config/app';

export default function UpgradeBanner() {
  const { t } = useTranslation();
  const {
    subscription,
    isTrialing,
    trialDaysLeft,
    monthlyTransactionCount,
    transactionLimit,
  } = useSubscription();

  // Check if user has ever had a trial (trial_end being set means they had one)
  const hasHadTrial = subscription?.subscription_status !== 'none'
    || subscription?.period_end != null;

  const [dismissed, setDismissed] = useState(false);

  // Check if banner was dismissed today
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const dismissedDate = localStorage.getItem('upgrade_banner_dismissed');
    if (dismissedDate === today) {
      setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('upgrade_banner_dismissed', today);
    setDismissed(true);
  };

  // Only hide for active subscribers who are NOT pending cancellation
  const hasActivePaidSubscription = subscription?.subscription_status === 'active'
    && !subscription?.subscription_cancel_at;
  if (hasActivePaidSubscription || dismissed) return null;

  // Don't show if no usage yet (except during trial)
  if (!isTrialing && monthlyTransactionCount === 0) return null;

  const usagePercent = Math.min((monthlyTransactionCount / transactionLimit) * 100, 100);

  return (
    <div className="mb-6 relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 p-6 text-white shadow-lg">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/20 transition-colors"
        aria-label={t('upgrade.dismiss')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {isTrialing ? (
        // Trial variant
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {t('subscription.trialEndsIn', { days: trialDaysLeft })}
              </h3>
              <p className="text-sm text-blue-100">
                {t('subscription.enjoyingPremium')}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-yellow-300 to-orange-300 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.max(5, (trialDaysLeft / APP_CONFIG.TRIAL_DAYS) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 mt-1">
              {t('subscription.trialDaysRemaining', { count: trialDaysLeft })}
            </p>
          </div>
        </>
      ) : (
        // Free tier usage variant
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {t('upgrade.bannerFreeLimit', { used: monthlyTransactionCount, limit: transactionLimit })}
              </h3>
              <p className="text-sm text-blue-100">
                {t('upgrade.bannerSubtitle')}
              </p>
            </div>
          </div>
          {/* Usage bar */}
          <div className="mb-4">
            <div className="w-full bg-white/20 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  usagePercent >= 100
                    ? 'bg-red-300'
                    : usagePercent >= 80
                    ? 'bg-yellow-300'
                    : 'bg-white'
                }`}
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 mt-1">
              {t('upgrade.usageCount', { used: monthlyTransactionCount, limit: transactionLimit })}
            </p>
          </div>
          <Link to="/pricing">
            <button className="w-full sm:w-auto bg-white text-indigo-600 px-6 py-2.5 rounded-lg font-bold hover:bg-blue-50 transition-colors shadow-md">
              {hasHadTrial ? t('upgrade.upgradeCta') : t('pricing.subscribe')}
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
