import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { fetchSubscription, getMonthlyTransactionCount } from '../utils/api';

const SubscriptionContext = createContext();

const FREE_TRANSACTION_LIMIT = 10;

export function SubscriptionProvider({ children }) {
  const { accessToken, loading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [monthlyTransactionCount, setMonthlyTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, count] = await Promise.all([
        fetchSubscription(),
        getMonthlyTransactionCount(),
      ]);

      // Debug logging
      console.log('📊 Subscription loaded:', {
        status: sub?.subscription_status,
        plan: sub?.subscription_plan,
        isPremium: sub?.is_premium,
        isTrialing: sub?.is_trialing,
        trialDaysLeft: sub?.trial_days_left,
        paddleSubId: sub?.paddle_subscription_id,
      });

      setSubscription(sub);
      setMonthlyTransactionCount(count ?? 0);
    } catch (e) {
      console.error('Error loading subscription:', e);
      setSubscription(null);
      setMonthlyTransactionCount(0);
    }
    setLoading(false);
  }, []);

  const refreshSubscription = useCallback(async () => {
    try {
      const [sub, count] = await Promise.all([
        fetchSubscription(),
        getMonthlyTransactionCount(),
      ]);
      setSubscription(sub);
      setMonthlyTransactionCount(count ?? 0);
    } catch (e) {
      console.error('Error refreshing subscription:', e);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (accessToken) {
      loadSubscription();
    } else {
      setSubscription(null);
      setMonthlyTransactionCount(0);
      setLoading(false);
    }
  }, [accessToken, authLoading, loadSubscription]);

  // Listen for Paddle checkout completion events
  useEffect(() => {
    const handlePaddleEvent = (e) => {
      const event = e.detail;
      console.log('🎯 Paddle event received:', event?.name, event);

      if (event?.name === 'checkout.completed') {
        console.log('✅ Checkout completed! Refreshing subscription in 2 seconds...');
        // Refresh subscription after checkout (small delay for webhook to process)
        setTimeout(() => {
          console.log('🔄 Refreshing subscription now...');
          refreshSubscription();
        }, 2000);
      }
    };
    window.addEventListener('paddle-event', handlePaddleEvent);
    return () => window.removeEventListener('paddle-event', handlePaddleEvent);
  }, [refreshSubscription]);

  const isPremium = useMemo(() => {
    if (!subscription) return false;
    return subscription.is_premium === true;
  }, [subscription]);

  const isTrialing = useMemo(() => {
    if (!subscription) return false;
    return subscription.is_trialing === true;
  }, [subscription]);

  const trialDaysLeft = useMemo(() => {
    if (!subscription) return 0;
    return subscription.trial_days_left ?? 0;
  }, [subscription]);

  const canAddTransaction = useMemo(() => {
    if (isPremium) return true;
    return monthlyTransactionCount < FREE_TRANSACTION_LIMIT;
  }, [isPremium, monthlyTransactionCount]);

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      isTrialing,
      trialDaysLeft,
      monthlyTransactionCount,
      canAddTransaction,
      transactionLimit: FREE_TRANSACTION_LIMIT,
      refreshSubscription,
      loading,
    }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscription() {
  return useContext(SubscriptionContext);
}
