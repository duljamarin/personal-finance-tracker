import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useSubscription } from '../../context/SubscriptionContext';
import { APP_CONFIG } from '../../config/app';
import { EXPENSE_COLOR } from '../../utils/chartColors';

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
    loading: subLoading,
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

  // Derive trial-expired state: user had a trial but NEVER paid, and is no longer premium.
  const hadPaidSubscription = !!subscription?.paddle_subscription_id;
  const trialExpired = hasHadTrial && !isPremium && !isTrialing && !hadPaidSubscription;

  const [dismissed, setDismissed] = useState(false);

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

  const isCancelled = subscription?.subscription_cancel_at != null;
  const hasActivePaidSubscription = subscription?.subscription_status === 'active' && !isCancelled;

  // Reserve layout space while loading to prevent CLS — render a fixed-height placeholder
  if (subLoading) {
    return <div className="mb-6 h-[88px] rounded-container bg-surface-hairline dark:bg-surface-dark-hairline animate-pulse" />;
  }

  if (hasActivePaidSubscription || dismissed) return null;
  if (!trialExpired && !isTrialing && !isCancelled && monthlyTransactionCount === 0) return null;

  const usagePercent = Math.min((monthlyTransactionCount / transactionLimit) * 100, 100);

  return (
    <div className="mb-6 relative rounded-container bg-white dark:bg-surface-dark-card border border-surface-hairline dark:border-surface-dark-hairline border-l-2 border-l-brand-600 dark:border-l-brand-400 p-6">
      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-ink-muted dark:text-white hover:bg-surface-subtle dark:hover:bg-surface-dark-subtle transition-colors"
        aria-label={t('upgrade.dismiss')}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {isCancelled && subscription?.period_end ? (
        // Cancelled subscription
        <>
          <div className="flex items-start gap-3 mb-3 pr-8">
            <div className="flex-1">
              <h3 className="text-heading text-ink-primary dark:text-white mb-1">
                {t('subscription.cancelled')}
              </h3>
              <p className="text-sm text-ink-muted dark:text-white">
                {t('subscription.accessEndsOn', { date: new Date(subscription.period_end).toLocaleDateString() })}
              </p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {t('upgrade.viewPlans')}
          </Link>
        </>
      ) : isTrialing ? (
        // Trial variant
        <>
          <div className="flex items-start gap-3 mb-3 pr-8">
            <div className="flex-1">
              <h3 className="text-heading text-ink-primary dark:text-white mb-1">
                {trialTimeLabel}
              </h3>
              <p className="text-sm text-ink-muted dark:text-white">
                {t('subscription.enjoyingPremium')}
              </p>
            </div>
          </div>
          {/* Progress bar */}
          <div>
            <div className="w-full bg-surface-subtle dark:bg-surface-dark-subtle rounded-full h-2 overflow-hidden">
              <div
                className="bg-brand-600 dark:bg-brand-500 h-full rounded-md transition-all duration-300"
                style={{ width: `${trialDaysLeft === 0 && trialEndsAt
                  ? Math.max(5, ((new Date(trialEndsAt) - Date.now()) / (APP_CONFIG.TRIAL_DAYS * 86400000)) * 100)
                  : Math.max(5, (trialDaysLeft / APP_CONFIG.TRIAL_DAYS) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-ink-muted dark:text-white mt-1">
              {trialDaysLeft === 0 && trialEndsAt ? trialTimeLabel : t('subscription.trialDaysRemaining', { count: trialDaysLeft })}
            </p>
          </div>
        </>
      ) : trialExpired ? (
        // Trial expired
        <>
          <div className="flex items-start gap-3 mb-3 pr-8">
            <div className="flex-1">
              <h3 className="text-heading text-ink-primary dark:text-white mb-1">
                {t('subscription.trialEnded')}
              </h3>
              <p className="text-sm text-ink-muted dark:text-white">
                {t('subscription.trialEndedDesc')}
              </p>
            </div>
          </div>
          <Link to="/pricing" className="inline-flex items-center gap-2 w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('upgrade.upgradeCta')}
          </Link>
        </>
      ) : (
        // Free tier usage variant
        <>
          <div className="flex items-start gap-3 mb-3 pr-8">
            <div className="flex-1">
              <h3 className="text-heading text-ink-primary dark:text-white mb-1">
                {t('upgrade.bannerFreeLimit', { used: monthlyTransactionCount, limit: transactionLimit })}
              </h3>
              <p className="text-sm text-ink-muted dark:text-white">
                {t('upgrade.bannerSubtitle')}
              </p>
            </div>
          </div>
          {/* Usage bar */}
          <div className="mb-4">
            <div className="w-full bg-surface-subtle dark:bg-surface-dark-subtle rounded-full h-2 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${usagePercent}%`,
                  backgroundColor: usagePercent >= 100 ? EXPENSE_COLOR : undefined,
                }}
              >
                {usagePercent < 100 && (
                  <div className="h-full w-full rounded-md bg-brand-600 dark:bg-brand-500" />
                )}
              </div>
            </div>
            <p className="text-xs text-ink-muted dark:text-white mt-1">
              {t('upgrade.usageCount', { used: monthlyTransactionCount, limit: transactionLimit })}
            </p>
          </div>
          <Link to="/pricing">
            <button className="w-full sm:w-auto bg-brand-600 hover:bg-brand-700 text-white px-6 py-2.5 rounded-md font-medium transition-colors">
              {t('upgrade.upgradeCta')}
            </button>
          </Link>
        </>
      )}
    </div>
  );
}
