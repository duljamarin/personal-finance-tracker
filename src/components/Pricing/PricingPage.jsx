import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
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
  const { subscription, isPremium, isTrialing, trialDaysLeft, refreshSubscription } = useSubscription();
  const paddle = usePaddle();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // Debug logging - logs subscription state changes
  useEffect(() => {
    console.log('🔍 Subscription Debug Info:', {
      subscription: subscription,
      status: subscription?.subscription_status,
      plan: subscription?.subscription_plan,
      isPremium,
      isTrialing,
      trialDaysLeft,
      paddleSubId: subscription?.paddle_subscription_id,
      periodEnd: subscription?.period_end,
      cancelAt: subscription?.subscription_cancel_at,
    });
  }, [subscription, isPremium, isTrialing, trialDaysLeft]);

  const handleSubscribe = (priceId) => {
    if (!accessToken) {
      navigate('/register');
      return;
    }

    if (!paddle) {
      addToast(t('messages.error'), 'error');
      return;
    }

    paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { user_id: user.id },
      customer: { email: user.email },
      settings: {
        displayMode: 'overlay',
        theme: 'light',
        successUrl: window.location.origin + '/dashboard',
      },
    });

    // Listen for checkout completion to refresh subscription
    const handleCheckoutComplete = () => {
      console.log('✅ Checkout completed, refreshing subscription...');
      setTimeout(() => {
        refreshSubscription();
      }, 2000);
    };

    window.addEventListener('paddle-event', (e) => {
      if (e.detail?.name === 'checkout.completed') {
        handleCheckoutComplete();
      }
    }, { once: true });
  };

  const handleManageSubscription = async () => {
    if (!subscription?.paddle_subscription_id) {
      addToast(t('messages.error'), 'error');
      return;
    }

    try {
      // Call backend edge function to get management URLs from Paddle
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

      // Redirect to Paddle's update payment method page (primary management action)
      if (data.update_payment_url) {
        window.open(data.update_payment_url, '_blank');
      } else if (data.cancel_url) {
        window.open(data.cancel_url, '_blank');
      } else {
        throw new Error('No management URLs returned');
      }
    } catch (error) {
      console.error('Error opening subscription management:', error);
      addToast('Unable to open subscription management. Please contact support.', 'error');
    }
  };

  const isCurrentPlan = (plan) => {
    if (!subscription) return false;
    const subPlan = subscription.subscription_plan;
    const status = subscription.subscription_status;
    return subPlan === plan && (status === 'active' || status === 'trialing');
  };

  // Check if user has ever had a trial (to prevent showing "Start Trial" again)
  const hasHadTrial = useMemo(() => {
    if (!subscription) {
      console.log('🔍 hasHadTrial check: subscription is null/undefined');
      return false;
    }
    const status = subscription.subscription_status;
    const result = status !== 'none';
    console.log('🔍 hasHadTrial check:', {
      status,
      result,
      willShowTrialText: !result,
      subscriptionObject: subscription
    });
    return result;
  }, [subscription]);

  // Debug: Track hasHadTrial changes
  useEffect(() => {
    console.log('🎨 Rendering with hasHadTrial:', hasHadTrial);
  }, [hasHadTrial]);

  // Determine button state for premium plans
  const getButtonState = (plan) => {
    if (!accessToken) return 'login';
    if (isCurrentPlan(plan)) return 'current';
    if (isPremium) return 'downgrade'; // User has different premium plan
    return 'subscribe';
  };

  const freeFeatures = [
    t('pricing.freeFeatures.transactions'),
    t('pricing.freeFeatures.categories'),
    t('pricing.freeFeatures.dashboard'),
  ];

  const premiumFeatures = [
    t('pricing.premiumFeatures.transactions'),
    t('pricing.premiumFeatures.categories'),
    t('pricing.premiumFeatures.recurring'),
    t('pricing.premiumFeatures.goals'),
    t('pricing.premiumFeatures.budgets'),
    t('pricing.premiumFeatures.healthScore'),
    t('pricing.premiumFeatures.benchmarks'),
  ];

  return (
    <div className="max-w-5xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mb-4">
          {t('pricing.title')}
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Active subscription notice */}
      {isPremium && subscription?.subscription_status !== 'none' && (
        <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-200">
              {t('subscription.proBadge')}
            </span>
            <span className="text-green-800 dark:text-green-200 font-medium">
              {isTrialing
                ? t('subscription.trialEndsIn', { days: trialDaysLeft })
                : t('subscription.active')}
            </span>
          </div>
          {subscription?.paddle_subscription_id && (
            <button
              onClick={handleManageSubscription}
              className="text-sm text-green-700 dark:text-green-300 underline hover:no-underline"
            >
              {t('pricing.managePlan')}
            </button>
          )}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {/* Free Plan */}
        <Card className="relative border-2 border-gray-200 dark:border-gray-600">
          <div className="p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('pricing.free')}
            </h3>
            <div className="mb-6">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">€0</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">{t('pricing.perMonth')}</span>
            </div>
            <ul className="space-y-3 mb-8">
              {freeFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-gray-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
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
        </Card>

        {/* Monthly Plan */}
        <Card className="relative border-2 border-indigo-500 dark:border-indigo-400 shadow-lg">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {t('pricing.popular')}
            </span>
          </div>
          <div className="p-6 pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('pricing.monthly')}
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('pricing.monthlyPrice')}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">{t('pricing.perMonth')}</span>
            </div>
            {!hasHadTrial && (
              <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium mb-6">
                {t('pricing.freeTrial')}
              </p>
            )}
            {hasHadTrial && <div className="mb-6" />}
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-indigo-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {isCurrentPlan('monthly') ? (
              <>
                <Button variant="primary" className="w-full mb-2" disabled>
                  {isTrialing ? t('subscription.onTrial') : t('pricing.currentPlan')}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleManageSubscription}
                >
                  {t('pricing.managePlan')}
                </Button>
              </>
            ) : isPremium ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleSubscribe(MONTHLY_PRICE_ID)}
              >
                Switch to Monthly
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                onClick={() => handleSubscribe(MONTHLY_PRICE_ID)}
              >
                {t('pricing.subscribe')}
              </Button>
            )}
          </div>
        </Card>

        {/* Yearly Plan */}
        <Card className="relative border-2 border-emerald-500 dark:border-emerald-400">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <span className="bg-emerald-600 text-white text-xs font-bold px-3 py-1 rounded-full">
              {t('pricing.bestValue')}
            </span>
          </div>
          <div className="p-6 pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {t('pricing.yearly')}
            </h3>
            <div className="mb-2">
              <span className="text-4xl font-extrabold text-gray-900 dark:text-white">{t('pricing.yearlyPrice')}</span>
              <span className="text-gray-500 dark:text-gray-400 ml-1">{t('pricing.perYear')}</span>
            </div>
            {!hasHadTrial ? (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-6">
                {t('pricing.saveYearly')} &middot; {t('pricing.freeTrial')}
              </p>
            ) : (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium mb-6">
                {t('pricing.saveYearly')}
              </p>
            )}
            <ul className="space-y-3 mb-8">
              {premiumFeatures.map((feature, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <svg className="w-5 h-5 text-emerald-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  {feature}
                </li>
              ))}
            </ul>
            {isCurrentPlan('yearly') ? (
              <>
                <Button variant="success" className="w-full mb-2" disabled>
                  {isTrialing ? t('subscription.onTrial') : t('pricing.currentPlan')}
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleManageSubscription}
                >
                  {t('pricing.managePlan')}
                </Button>
              </>
            ) : isPremium ? (
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => handleSubscribe(YEARLY_PRICE_ID)}
              >
                Switch to Yearly
              </Button>
            ) : (
              <Button
                variant="success"
                className="w-full"
                onClick={() => handleSubscribe(YEARLY_PRICE_ID)}
              >
                {t('pricing.subscribe')}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Back to dashboard */}
      {accessToken && (
        <div className="text-center">
          <Link
            to="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
          >
            {t('nav.dashboard')}
          </Link>
        </div>
      )}
    </div>
  );
}
