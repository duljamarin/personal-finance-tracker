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
    trialEndsAt,
    monthlyTransactionCount,
    transactionLimit,
    hasHadTrial,
    isPremium,
  } = useSubscription();

  const trialTimeLabel = (() => {
    if (trialDaysLeft === 0 && trialEndsAt) {
      const msLeft = new Date(trialEndsAt) - Date.now();
      const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
      const minsLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
      return t('subscription.trialEndsInHours', { hours: hoursLeft, minutes: minsLeft });
    }
    return t('subscription.trialEndsIn', { days: trialDaysLeft });
  })();

  // Derive trial-expired state: user had a trial (or subscription) but is no longer premium
  const trialExpired = hasHadTrial && !isPremium && !isTrialing;

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

  // Show banner if cancelled, trial expired, or on free tier with usage
  const isCancelled = subscription?.subscription_cancel_at != null;
  const hasActivePaidSubscription = subscription?.subscription_status === 'active' && !isCancelled;
  if (hasActivePaidSubscription || dismissed) return null;

  // Always show if trial expired; otherwise only if there's usage or trialing
  if (!trialExpired && !isTrialing && !isCancelled && monthlyTransactionCount === 0) return null;

  const usagePercent = Math.min((monthlyTransactionCount / transactionLimit) * 100, 100);

  return (
    <div className="mb-6 relative overflow-hidden rounded-xl bg-brand-600 p-6 text-white shadow-sm">
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

      {isCancelled && subscription?.period_end ? (
        // Cancelled subscription - show access end date
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {t('subscription.cancelled')}
              </h3>
              <p className="text-sm text-blue-100">
                {t('subscription.accessEndsOn', { date: new Date(subscription.period_end).toLocaleDateString() })}
              </p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 w-full sm:w-auto bg-white text-brand-600 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('upgrade.viewPlans')}
          </Link>
        </>
      ) : isTrialing ? (
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
                {trialTimeLabel}
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
                className="bg-white/80 h-full rounded-full transition-all duration-300"
                style={{ width: `${trialDaysLeft === 0 && trialEndsAt
                  ? Math.max(5, ((new Date(trialEndsAt) - Date.now()) / (APP_CONFIG.TRIAL_DAYS * 86400000)) * 100)
                  : Math.max(5, (trialDaysLeft / APP_CONFIG.TRIAL_DAYS) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-blue-100 mt-1">
              {trialDaysLeft === 0 && trialEndsAt ? trialTimeLabel : t('subscription.trialDaysRemaining', { count: trialDaysLeft })}
            </p>
          </div>
        </>
      ) : trialExpired ? (
        // Trial expired — nudge to subscribe (no trial option)
        <>
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">
                {t('subscription.trialEnded')}
              </h3>
              <p className="text-sm text-blue-100">
                {t('subscription.trialEndedDesc')}
              </p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 w-full sm:w-auto bg-white text-brand-600 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('upgrade.upgradeCta')}
          </Link>
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
            <button className="w-full sm:w-auto bg-white text-brand-600 px-6 py-2.5 rounded-lg font-bold hover:bg-gray-50 transition-colors shadow-sm">
              {hasHadTrial ? t('upgrade.upgradeCta') : t('pricing.subscribe')}
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
