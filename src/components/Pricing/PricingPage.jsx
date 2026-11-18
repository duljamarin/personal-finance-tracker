import { delayStyle, tileDelay } from '../../utils/motion';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { usePaddle } from '../../hooks/usePaddle';
import { useToast } from '../../context/ToastContext';
import { trackEvent } from '../../lib/analytics';
import { useMetaTags } from '../../hooks/useMetaTags';
import Card from '../UI/Card';
import Button from '../UI/Button';

const YEARLY_PRICE_ID = import.meta.env.VITE_PADDLE_YEARLY_PRICE_ID;

/**
 * Both language variants are registered routes, so each must canonicalise to
 * ITSELF and declare the other as its alternate. Pointing both at /pricing would
 * de-index the Albanian URL that the language switcher now produces and shares.
 */
const HREFLANGS = [
  { lang: 'en', href: 'https://personal-finances.app/pricing' },
  { lang: 'sq', href: 'https://personal-finances.app/sq/pricing' },
  { lang: 'x-default', href: 'https://personal-finances.app/pricing' },
];

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { accessToken, user } = useAuth();
  const { subscription, isPremium, isTrialing, trialDaysLeft, trialEndsAt, hasHadTrial, startTrial } = useSubscription();
  const paddle = usePaddle();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const checkoutInitiatedRef = useRef(false);
  const [trialLoading, setTrialLoading] = useState(false);

  const isSq = (i18n.language || '').toLowerCase().startsWith('sq');
  useMetaTags({
    title: `${t('pricing.metaTitle')} | Personal Finances`,
    description: t('pricing.metaDescription'),
    canonical: `https://personal-finances.app${isSq ? '/sq/pricing' : '/pricing'}`,
    hreflangs: HREFLANGS,
  });

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
    <div className="max-w-content mx-auto py-8">
      {/* Header */}
      <div className="mb-10 grid lg:grid-cols-12 gap-gap items-end">
        <h1 className="lg:col-span-6 text-h1-lg font-extrabold text-fg">
          {t('pricing.title')}
        </h1>
        <p className="lg:col-start-8 lg:col-span-5 text-body-lg text-fg">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Active subscription notice */}
      {isPremium && subscription?.subscription_status !== 'none' && (
        <div className={`mb-8 tile p-tile-dense text-center ${
          subscription?.subscription_cancel_at ? '!border-warning border-2' : ''
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`inline-flex items-center h-[26px] px-2.5 rounded-pill text-min font-extrabold ${
              subscription?.subscription_cancel_at
                ? 'bg-inner text-warning'
                : 'bg-brand-600 text-white'
            }`}>
              {t('subscription.proBadge')}
            </span>
            <span className={subscription?.subscription_cancel_at
              ? 'text-warning font-bold'
              : 'text-brand-text font-bold'
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
                ? 'btn-motion mt-2 inline-flex items-center min-h-11 px-4 rounded-pill text-sm font-bold text-warning hover:bg-inner'
                : 'btn-motion mt-2 inline-flex items-center min-h-11 px-4 rounded-pill text-sm font-bold text-brand-text hover:bg-inner'
              }
            >
              {t('pricing.managePlan')}
            </button>
          )}
        </div>
      )}

      {/* Savings callout banner */}
      {!isPremium && (
        // Plain line, not a tinted pill with an icon (ui-quality-principles #2).
        <p className="-mt-6 mb-8 text-sm font-semibold text-fg">
          {t('pricing.savingsCallout')}
        </p>
      )}

      {/* Plan Cards */}
      <div className="tile-inner rounded-hero p-[clamp(16px,4vw,48px)] grid grid-cols-1 md:grid-cols-2 gap-gap mb-10 items-stretch">

        {/* ── FREE ── */}
        <div className="tile tile-lift flex flex-col animate-pop" style={delayStyle(tileDelay(0))}>
          {/* header */}
          <div className="px-6 pt-6 pb-4">
            <h2 className="text-h3-lg font-bold text-fg mb-2">
              {t('pricing.free')}
            </h2>
            <div>
              <span className="text-h1 font-extrabold tabular-nums text-fg">€0</span>
              <span className="text-fg font-semibold ml-1">{t('pricing.forever')}</span>
            </div>
          </div>
          {/* features */}
          <div className="px-6 py-4 flex-1">
            <ul className="space-y-3">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-body font-semibold text-fg">
                  <svg className="w-5 h-5 text-brand-text flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            {!isYearlyPlan && !hasHadTrial && (
              <p className="text-sm text-center mt-2 invisible" aria-hidden="true">placeholder</p>
            )}
          </div>
        </div>

        {/* ── PREMIUM ── */}
        <div className="tile tile-hero tile-lift flex flex-col relative animate-pop" style={delayStyle(tileDelay(1))}>
          {/* header */}
          <div className="px-6 pt-6 pb-4">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h2 className="text-h3-lg font-bold">
                {t('pricing.premium')}
              </h2>
              <span className="inline-flex items-center h-[30px] px-3 rounded-pill bg-hero-inset text-sm font-bold">
                {t('pricing.bestValue')}
              </span>
            </div>
            <div className="mb-1">
              <span className="text-kpi font-extrabold tabular-nums">
                {t('pricing.yearlyPrice')}
              </span>
              <span className="font-semibold ml-1">{t('pricing.perYear')}</span>
            </div>
            <div className="mb-1">
              <span className="text-base font-bold">
                {t('pricing.yearlyPerMonth')}
              </span>
            </div>
            <p className="text-sm font-semibold">
              {t('pricing.saveYearly')}
              {!hasHadTrial && <span> · {t('pricing.freeTrial')}</span>}
            </p>
          </div>
          {/* features */}
          <div className="px-6 py-4 flex-1">
            <ul className="space-y-3">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2.5 text-body font-semibold">
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--toast-check)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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

                let textColor = 'text-brand-text';
                let label = '';
                let btnLabel = t('pricing.managePlan');
                let btnVariant = 'inverse';

                if (isCancelScheduled) {
                  textColor = 'text-warning';
                  label = t('subscription.cancelledAccessUntil', { date: new Date(subscription.period_end).toLocaleDateString() });
                  btnLabel = t('pricing.reactivate');
                  btnVariant = 'inverse';
                } else if (isPastDue) {
                  textColor = 'text-expense';
                  label = t('subscription.pastDueNotice');
                  btnLabel = t('pricing.updatePayment');
                  btnVariant = 'danger';
                } else if (isPaused) {
                  textColor = 'text-warning';
                  label = t('subscription.paused');
                  btnLabel = t('pricing.resumePlan');
                  btnVariant = 'inverse';
                } else if (isCancelled) {
                  textColor = 'text-warning';
                  label = t('subscription.cancelledAccessUntil', { date: new Date(subscription.period_end).toLocaleDateString() });
                  btnLabel = t('pricing.reactivate');
                  btnVariant = 'inverse';
                }

                const showStatusLabel = isCancelScheduled || isPastDue || isPaused || isCancelled;
                return (
                  <>
                    {showStatusLabel && (
                      <p className={`inline-block rounded-pill bg-white px-3 py-1 text-sm font-bold mb-3 ${textColor}`}>{label}</p>
                    )}
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
                variant="inverse"
                className="w-full mb-2"
                onClick={handleStartTrial}
                disabled={trialLoading}
              >
                {trialLoading ? t('messages.loading') : t('pricing.startFreeTrial')}
              </Button>
              <p className="text-sm font-semibold text-center">
                {t('pricing.noCardRequired')} · {t('pricing.thenYearly')}
              </p>
            </>
          ) : (
            <Button variant="inverse" className="w-full" onClick={handleSubscribe} trailing="arrow">
              {t('pricing.subscribe')}
            </Button>
          )}
          </div>{/* end CTA */}
        </div>{/* end Premium card */}

      </div>{/* end grid */}

      {/* Trust strip */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-semibold text-fg mb-8">
        <span className="flex items-center gap-1">
          <svg className="w-[18px] h-[18px] text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          {t('pricing.trustSecure')}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-[18px] h-[18px] text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {t('pricing.trustCancel')}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-[18px] h-[18px] text-brand-text" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          {t('pricing.trustPaddle')}
        </span>
      </div>

      {/* Back to dashboard */}
      {accessToken && (
        <div>
          <Link
            to="/dashboard"
            className="group inline-flex items-center gap-1.5 min-h-11 text-sm font-bold text-brand-text"
          >
            {t('nav.dashboard')}
          </Link>
        </div>
      )}
    </div>
  );
}
