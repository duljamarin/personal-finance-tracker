import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { usePaddle } from '../../hooks/usePaddle';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import Card from '../UI/Card';
import Button from '../UI/Button';

const YEARLY_PRICE_ID = import.meta.env.VITE_PADDLE_YEARLY_PRICE_ID;

export default function PricingPage() {
  const { t } = useTranslation();
  const { accessToken, user } = useAuth();
  const { subscription, isPremium, isTrialing, trialDaysLeft, trialEndsAt, hasHadTrial, startTrial } = useSubscription();
  const paddle = usePaddle();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const checkoutInitiatedRef = useRef(false);
  const [trialLoading, setTrialLoading] = useState(false);

  const trialTimeLabel = (() => {
    if (trialDaysLeft === 0 && trialEndsAt) {
      const msLeft = new Date(trialEndsAt) - Date.now();
      const hoursLeft = Math.max(0, Math.floor(msLeft / 3600000));
      const minsLeft = Math.max(0, Math.floor((msLeft % 3600000) / 60000));
      return t('subscription.trialEndsInHours', { hours: hoursLeft, minutes: minsLeft });
    }
    return t('subscription.trialEndsIn', { days: trialDaysLeft });
  })();

  useEffect(() => {
    if (checkoutInitiatedRef.current && isPremium) {
      checkoutInitiatedRef.current = false;
      trackEvent('PremiumUpgrade');
      navigate('/dashboard', { replace: true });
    }
  }, [isPremium, navigate]);

  const handleStartTrial = async () => {
    if (!accessToken) {
      navigate('/register');
      return;
    }
    setTrialLoading(true);
    try {
      await startTrial();
      addToast(t('subscription.trialStarted'), 'success');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.message || '';
      if (msg.includes('Trial already used')) {
        addToast(t('subscription.trialAlreadyUsed'), 'error');
      } else {
        addToast(t('messages.error'), 'error');
      }
    } finally {
      setTrialLoading(false);
    }
  };

  const handleSubscribe = () => {
    if (!accessToken) {
      navigate('/register');
      return;
    }

    if (!paddle) {
      addToast(t('messages.error'), 'error');
      return;
    }

    checkoutInitiatedRef.current = true;

    paddle.Checkout.open({
      items: [{ priceId: YEARLY_PRICE_ID, quantity: 1 }],
      customData: { user_id: user.id },
      customer: { email: user.email },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
      },
    });
  };

  const handleManageSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      addToast(t('messages.error'), 'error');
      return;
    }

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/get-customer-portal`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get management URLs');
      }

      const data = await response.json();

      if (data.update_payment_url) {
        window.open(data.update_payment_url, '_blank');
      } else if (data.cancel_url) {
        window.open(data.cancel_url, '_blank');
      } else {
        throw new Error('No management URLs returned');
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      addToast(t('messages.error'), 'error');
    }
  };

  const isCancelScheduled = !!subscription?.subscription_cancel_at;

  // True for any status where user has/had a yearly Paddle subscription —
  // covers active, past_due (grace period), cancelled (still within period_end), paused.
  // Trial is DB-only and never has plan='yearly', so no overlap.
  const isYearlyPlan = subscription?.subscription_plan === 'yearly'
    && ['active', 'past_due', 'cancelled', 'paused'].includes(subscription?.subscription_status);

  const freeFeatures = [
    t('pricing.freeFeatures.transactions'),
    t('pricing.freeFeatures.budgets'),
    t('pricing.freeFeatures.recurring'),
    t('pricing.freeFeatures.goals'),
    t('pricing.freeFeatures.healthScoreBasic'),
    t('pricing.freeFeatures.benchmarksBasic'),
    t('pricing.freeFeatures.categories'),
    t('pricing.freeFeatures.dashboard'),
    t('pricing.freeFeatures.netWorth'),
    t('pricing.freeFeatures.reports'),
  ];

  const premiumFeatures = [
    t('pricing.premiumFeatures.transactions'),
    t('pricing.premiumFeatures.budgets'),
    t('pricing.premiumFeatures.recurring'),
    t('pricing.premiumFeatures.goals'),
    t('pricing.premiumFeatures.healthScore'),
    t('pricing.premiumFeatures.benchmarks'),
    t('pricing.premiumFeatures.splits'),
    t('pricing.premiumFeatures.categories'),
    t('pricing.premiumFeatures.netWorth'),
    t('pricing.premiumFeatures.reports'),
  ];

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="font-semibold tracking-tight text-3xl sm:text-4xl text-ink-primary dark:text-white mb-3">
          {t('pricing.title')}
        </h1>
        <p className="text-lg text-ink-muted dark:text-white max-w-xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Active subscription notice */}
      {isPremium && subscription?.subscription_status !== 'none' && (
        <div className={`mb-8 p-4 rounded-xl text-center ${
          subscription?.subscription_cancel_at
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-300 dark:border-amber-700'
            : 'bg-brand-50 dark:bg-surface-dark-elevated border border-brand-500 dark:border-brand-600'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              subscription?.subscription_cancel_at
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-800/40 dark:text-amber-200'
                : 'bg-brand-600 text-white dark:bg-brand-600 dark:text-white'
            }`}>
              {t('subscription.proBadge')}
            </span>
            <span className={subscription?.subscription_cancel_at
              ? 'text-amber-800 dark:text-amber-300 font-medium'
              : 'text-brand-700 dark:text-white font-medium'
            }>
              {subscription?.subscription_cancel_at && subscription?.period_end
                ? t('subscription.cancelledAccessUntil', { date: new Date(subscription.period_end).toLocaleDateString() })
                : isTrialing
                ? trialTimeLabel
                : t('subscription.active')}
            </span>
          </div>
          {subscription?.paddle_subscription_id && (
            <button
              onClick={handleManageSubscription}
              className={subscription?.subscription_cancel_at
                ? 'text-sm text-amber-700 dark:text-amber-300 underline hover:no-underline'
                : 'text-sm text-brand-600 dark:text-brand-400 underline hover:no-underline'
              }
            >
              {t('pricing.managePlan')}
            </button>
          )}
        </div>
      )}

      {/* Savings callout banner */}
      {!isPremium && (
        <div className="mb-8 flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-600 text-sm font-medium px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            {t('pricing.savingsCallout')}
          </span>
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10 items-end">

        {/* ── FREE ── */}
        <div className="flex flex-col rounded-[10px] border border-surface-hairline dark:border-surface-dark-hairline bg-white dark:bg-surface-dark-card overflow-hidden">
          {/* header */}
          <div className="px-6 pt-6 pb-4">
            <h3 className="font-semibold tracking-tight text-xl text-ink-primary dark:text-white mb-2">
              {t('pricing.free')}
            </h3>
            <div>
              <span className="font-semibold tracking-tight text-4xl text-ink-primary dark:text-white">€0</span>
              <span className="text-ink-muted dark:text-white ml-1">{t('pricing.forever')}</span>
            </div>
          </div>
          {/* features */}
          <div className="px-6 py-4 flex-1">
            <ul className="space-y-3">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-secondary dark:text-white">
                  <svg className="w-5 h-5 text-ink-muted dark:text-white flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          {/* CTA */}
          <div className="px-6 pb-6 pt-4">
            {!accessToken ? (
              <Link to="/register">
                <Button variant="secondary" className="w-full">{t('landing.hero.getStarted')}</Button>
              </Link>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                {!isPremium ? t('pricing.currentPlan') : t('pricing.free')}
              </Button>
            )}
          </div>
        </div>

        {/* ── PREMIUM ── */}
        <div className="flex flex-col rounded-[10px] border-2 border-brand-600 dark:border-brand-800 bg-white dark:bg-surface-dark-card overflow-hidden relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
            <span className="bg-emerald-800 text-white text-xs font-bold px-4 py-1 rounded-full shadow">
              {t('pricing.bestValue')}
            </span>
          </div>
          {/* header */}
          <div className="px-6 pt-8 pb-4">
            <h3 className="font-semibold tracking-tight text-xl text-ink-primary dark:text-white mb-2">
              {t('pricing.premium')}
            </h3>
            <div className="mb-1">
              <span className="font-semibold tracking-tight text-5xl text-ink-primary dark:text-white">
                {t('pricing.yearlyPrice')}
              </span>
              <span className="text-ink-muted dark:text-white ml-1">{t('pricing.perYear')}</span>
            </div>
            <div className="mb-1">
              <span className="text-base font-semibold text-emerald-600 dark:text-emerald-600">
                {t('pricing.yearlyPerMonth')}
              </span>
            </div>
            <p className="text-sm text-emerald-700 dark:text-emerald-800 font-medium">
              {t('pricing.saveYearly')}
              {!hasHadTrial && <span> · {t('pricing.freeTrial')}</span>}
            </p>
          </div>
          {/* features */}
          <div className="px-6 py-4 flex-1">
            <ul className="space-y-3">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-primary dark:text-ink-dark-primary">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
          {/* CTA */}
          <div className="px-6 pb-6 pt-4">
          {isYearlyPlan ? (
            <>
              {(() => {
                const status = subscription?.subscription_status;
                const isPastDue = status === 'past_due';
                const isPaused  = status === 'paused';
                const isCancelled = status === 'cancelled';

                let dotColor = 'bg-brand-500';
                let textColor = 'text-brand-600 dark:text-white';
                let label = t('pricing.currentPlan');
                let btnLabel = t('pricing.managePlan');
                let btnVariant = 'success';

                if (isCancelScheduled) {
                  dotColor = 'bg-amber-500';
                  textColor = 'text-amber-600 dark:text-amber-400';
                  label = t('subscription.cancelledAccessUntil', { date: new Date(subscription.period_end).toLocaleDateString() });
                  btnLabel = t('pricing.reactivate');
                  btnVariant = 'primary';
                } else if (isPastDue) {
                  dotColor = 'bg-red-500';
                  textColor = 'text-red-600 dark:text-red-400';
                  label = t('subscription.pastDueNotice');
                  btnLabel = t('pricing.updatePayment');
                  btnVariant = 'danger';
                } else if (isPaused) {
                  dotColor = 'bg-amber-500';
                  textColor = 'text-amber-600 dark:text-amber-400';
                  label = t('subscription.paused');
                  btnLabel = t('pricing.resumePlan');
                  btnVariant = 'primary';
                } else if (isCancelled) {
                  dotColor = 'bg-amber-500';
                  textColor = 'text-amber-600 dark:text-amber-400';
                  label = t('subscription.cancelledAccessUntil', { date: new Date(subscription.period_end).toLocaleDateString() });
                  btnLabel = t('pricing.reactivate');
                  btnVariant = 'primary';
                }

                return (
                  <>
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-block w-2 h-2 rounded-full ${dotColor}`} />
                      <span className={`text-sm font-medium ${textColor}`}>{label}</span>
                    </div>
                    <Button variant={btnVariant} className="w-full" onClick={handleManageSubscription}>
                      {btnLabel}
                    </Button>
                  </>
                );
              })()}
            </>
          ) : !hasHadTrial ? (
            <>
              <Button
                variant="success"
                className="w-full mb-2"
                onClick={handleStartTrial}
                disabled={trialLoading}
              >
                {trialLoading ? t('messages.loading') : t('pricing.startFreeTrial')}
              </Button>
              <p className="text-xs text-center text-ink-muted dark:text-white">
                {t('pricing.noCardRequired')} · {t('pricing.thenYearly')}
              </p>
            </>
          ) : (
            <Button variant="success" className="w-full" onClick={handleSubscribe}>
              {t('pricing.subscribe')}
            </Button>
          )}
          </div>{/* end CTA */}
        </div>{/* end Premium card */}

      </div>{/* end grid */}

      {/* Trust strip */}
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-ink-muted dark:text-white mb-8">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {t('pricing.trustSecure')}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t('pricing.trustCancel')}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {t('pricing.trustPaddle')}
        </span>
      </div>

      {/* Back to dashboard */}
      {accessToken && (
        <div className="text-center">
          <Link
            to="/dashboard"
            className="text-sm text-ink-muted dark:text-white hover:text-ink-primary dark:hover:text-ink-dark-primary underline"
          >
            {t('nav.dashboard')}
          </Link>
        </div>
      )}
    </div>
  );
}
