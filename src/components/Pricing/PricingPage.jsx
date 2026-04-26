import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useSubscription } from '../../context/SubscriptionContext';
import { usePaddle } from '../../hooks/usePaddle';
import { useToast } from '../../context/ToastContext';
import Card from '../UI/Card';
import Button from '../UI/Button';

const MONTHLY_PRICE_ID = import.meta.env.VITE_PADDLE_MONTHLY_PRICE_ID;
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

  const handleSubscribe = (priceId) => {
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
      items: [{ priceId, quantity: 1 }],
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
        console.error('Error getting management URLs:', errorData);
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

  const isCurrentPlan = (plan) => {
    if (!subscription) return false;
    const subPlan = subscription.subscription_plan;
    const status = subscription.subscription_status;
    return subPlan === plan && (status === 'active' || status === 'trialing');
  };

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
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="font-display font-semibold tracking-tight text-3xl sm:text-4xl text-ink-primary dark:text-ink-dark-primary mb-4">
          {t('pricing.title')}
        </h1>
        <p className="text-lg text-ink-muted dark:text-ink-dark-muted max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Active subscription notice */}
      {isPremium && subscription?.subscription_status !== 'none' && (
        <div className={`mb-8 p-4 rounded-xl text-center ${
          subscription?.subscription_cancel_at
            ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
            : 'bg-brand-50 dark:bg-brand-900/20 border border-brand-200 dark:border-brand-800'
        }`}>
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
              subscription?.subscription_cancel_at
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-800 dark:text-amber-200'
                : 'bg-brand-100 text-brand-800 dark:bg-brand-800 dark:text-brand-200'
            }`}>
              {t('subscription.proBadge')}
            </span>
            <span className={subscription?.subscription_cancel_at
              ? 'text-amber-800 dark:text-amber-200 font-medium'
              : 'text-brand-700 dark:text-brand-300 font-medium'
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
                : 'text-sm text-brand-700 dark:text-brand-300 underline hover:no-underline'
              }
            >
              {t('pricing.managePlan')}
            </button>
          )}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Free Plan */}
        <Card className="relative border border-surface-hairline dark:border-surface-dark-hairline h-full">
          <div className="p-6 flex flex-col h-full">
            <h3 className="font-display font-semibold tracking-tight text-xl text-ink-primary dark:text-ink-dark-primary mb-2">
              {t('pricing.free')}
            </h3>
            <div className="mb-6">
              <span className="font-display font-semibold tracking-tight text-4xl text-ink-primary dark:text-ink-dark-primary">€0</span>
              <span className="text-ink-muted dark:text-ink-dark-muted ml-1">{t('pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 flex-1">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-primary dark:text-ink-dark-primary">
                  <svg className="w-5 h-5 text-ink-muted dark:text-ink-dark-muted flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium min-h-[1.25rem] mt-4" />
            <div className="mt-4">
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
        </Card>

        {/* Monthly Plan */}
        <Card className="relative ring-2 ring-brand-500 dark:ring-brand-400 border border-transparent h-full">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {t('pricing.popular')}
            </span>
          </div>
          <div className="p-6 pt-8 flex flex-col h-full">
            <h3 className="font-display font-semibold tracking-tight text-xl text-ink-primary dark:text-ink-dark-primary mb-2">
              {t('pricing.monthly')}
            </h3>
            <div className="mb-2">
              <span className="font-display font-semibold tracking-tight text-4xl text-ink-primary dark:text-ink-dark-primary">{t('pricing.monthlyPrice')}</span>
              <span className="text-ink-muted dark:text-ink-dark-muted ml-1">{t('pricing.perMonth')}</span>
            </div>
            <p className="text-sm font-medium mb-4 min-h-[1.25rem] text-brand-600 dark:text-brand-400">
              {!hasHadTrial ? t('pricing.freeTrial') : ''}
            </p>
            <ul className="space-y-3 flex-1">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-primary dark:text-ink-dark-primary">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {isCurrentPlan('monthly') ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                    <span className="text-sm font-medium text-brand-600 dark:text-brand-400">
                      {isTrialing
                        ? trialTimeLabel
                        : t('pricing.currentPlan')}
                    </span>
                  </div>
                  <Button variant="primary" className="w-full" onClick={handleManageSubscription}>
                    {t('pricing.managePlan')}
                  </Button>
                </>
              ) : isPremium && !isCurrentPlan('monthly') ? (
                <Button variant="secondary" className="w-full" onClick={() => handleSubscribe(MONTHLY_PRICE_ID)}>
                  {t('pricing.switchToMonthly')}
                </Button>
              ) : !hasHadTrial ? (
                <>
                  <Button
                    variant="primary"
                    className="w-full mb-2"
                    onClick={handleStartTrial}
                    disabled={trialLoading}
                  >
                    {trialLoading ? t('messages.loading') : t('pricing.startFreeTrial')}
                  </Button>
                  <p className="text-xs text-center text-ink-muted dark:text-ink-dark-muted">
                    {t('pricing.noCardRequired')}
                  </p>
                </>
              ) : (
                <Button variant="primary" className="w-full" onClick={() => handleSubscribe(MONTHLY_PRICE_ID)}>
                  {t('pricing.subscribe')}
                </Button>
              )}
            </div>
          </div>
        </Card>

        {/* Yearly Plan */}
        <Card className="relative border border-emerald-500 dark:border-emerald-400 h-full">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {t('pricing.bestValue')}
            </span>
          </div>
          <div className="p-6 pt-8 flex flex-col h-full">
            <h3 className="font-display font-semibold tracking-tight text-xl text-ink-primary dark:text-ink-dark-primary mb-2">
              {t('pricing.yearly')}
            </h3>
            <div className="mb-1">
              <span className="font-display font-semibold tracking-tight text-4xl text-ink-primary dark:text-ink-dark-primary">{t('pricing.yearlyPrice')}</span>
              <span className="text-ink-muted dark:text-ink-dark-muted ml-1">{t('pricing.perYear')}</span>
            </div>
            <p className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
              {t('pricing.yearlyPerMonth')}
            </p>
            <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-4 min-h-[1.25rem]">
              {!hasHadTrial
                ? `${t('pricing.saveYearly')} · ${t('pricing.freeTrial')}`
                : t('pricing.saveYearly')}
            </p>
            <ul className="space-y-3 flex-1">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-ink-primary dark:text-ink-dark-primary">
                  <svg className="w-5 h-5 text-brand-600 dark:text-brand-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            <p className="text-sm font-medium min-h-[1.25rem] mt-4" />
            <div className="mt-4">
              {isCurrentPlan('yearly') ? (
                <>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      {isTrialing
                        ? trialTimeLabel
                        : t('pricing.currentPlan')}
                    </span>
                  </div>
                  <Button variant="success" className="w-full" onClick={handleManageSubscription}>
                    {t('pricing.managePlan')}
                  </Button>
                </>
              ) : isPremium && !isCurrentPlan('yearly') ? (
                <Button variant="secondary" className="w-full" onClick={() => handleSubscribe(YEARLY_PRICE_ID)}>
                  {t('pricing.switchToYearly')}
                </Button>
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
                  <p className="text-xs text-center text-ink-muted dark:text-ink-dark-muted">
                    {t('pricing.noCardRequired')}
                  </p>
                </>
              ) : (
                <Button variant="success" className="w-full" onClick={() => handleSubscribe(YEARLY_PRICE_ID)}>
                  {t('pricing.subscribe')}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Back to dashboard */}
      {accessToken && (
        <div className="text-center">
          <Link
            to="/dashboard"
            className="text-sm text-ink-muted dark:text-ink-dark-muted hover:text-ink-primary dark:hover:text-ink-dark-primary underline"
          >
            {t('nav.dashboard')}
          </Link>
        </div>
      )}
    </div>
  );
}
