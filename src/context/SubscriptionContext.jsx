import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from './AuthContext';
import { fetchSubscription, getMonthlyTransactionCount } from '../utils/api';
import { APP_CONFIG } from '../config/app';

const SubscriptionContext = createContext();

const FREE_TRANSACTION_LIMIT = APP_CONFIG.FREE_TRANSACTION_LIMIT;
const POLL_INTERVAL = 3000; // 3 seconds between retries
const MAX_POLL_ATTEMPTS = 8; // up to ~24 seconds total

export function SubscriptionProvider({ children }) {
  const { accessToken, loading: authLoading } = useAuth();

  const [subscription, setSubscription] = useState(null);
  const [monthlyTransactionCount, setMonthlyTransactionCount] = useState(0);
  const [loading, setLoading] = useState(true);

  // Track in-flight refresh to prevent duplicate concurrent requests
  const refreshInFlightRef = useRef(null);
  const pollTimerRef = useRef(null);

  const loadSubscription = useCallback(async () => {
    setLoading(true);
    try {
      const [sub, count] = await Promise.all([
        fetchSubscription(),
        getMonthlyTransactionCount(),
      ]);

      setSubscription(sub);
      setMonthlyTransactionCount(count ?? 0);
    } catch (e) {
      console.error('Error loading subscription:', e);
      setSubscription(null);
      setMonthlyTransactionCount(0);
    }
    setLoading(false);
  }, []);

  /** Deduplicated refresh — concurrent calls share the same promise */
  const refreshSubscription = useCallback(async () => {
    // If a refresh is already in-flight, return the same promise
    if (refreshInFlightRef.current) {
      return refreshInFlightRef.current;
    }

    const promise = (async () => {
      try {
        const [sub, count] = await Promise.all([
          fetchSubscription(),
          getMonthlyTransactionCount(),
        ]);
        setSubscription(sub);
        setMonthlyTransactionCount(count ?? 0);
      } catch (e) {
        console.error('Error refreshing subscription:', e);
      } finally {
        refreshInFlightRef.current = null;
      }
    })();

    refreshInFlightRef.current = promise;
    return promise;
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
  // Use polling with retries instead of a fixed 2-second delay
  useEffect(() => {
    let cancelled = false;

    const handlePaddleEvent = (e) => {
      const event = e.detail;

      if (event?.name === 'checkout.completed') {
        let attempts = 0;

        // Clear any existing poll timer
        if (pollTimerRef.current) {
          clearTimeout(pollTimerRef.current);
          pollTimerRef.current = null;
        }

        const pollForUpdate = async () => {
          if (cancelled) return;
          attempts++;
          try {
            const sub = await fetchSubscription();
            if (cancelled) return;
            const isPremiumNow = sub?.is_premium === true;

            if (isPremiumNow) {
              // Webhook has been processed — do a full refresh
              await refreshSubscription();
              return;
            }
          } catch {
            // Ignore errors during polling
          }

          if (!cancelled && attempts < MAX_POLL_ATTEMPTS) {
            pollTimerRef.current = setTimeout(pollForUpdate, POLL_INTERVAL);
          } else if (!cancelled) {
            // Final attempt: do a full refresh regardless
            await refreshSubscription();
          }
        };

        // Start polling after a short initial delay
        pollTimerRef.current = setTimeout(pollForUpdate, POLL_INTERVAL);
      }
    };

    window.addEventListener('paddle-event', handlePaddleEvent);
    return () => {
      cancelled = true;
      window.removeEventListener('paddle-event', handlePaddleEvent);
      // Clean up any pending poll timer on unmount
      if (pollTimerRef.current) {
        clearTimeout(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
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

  const canCreateBudget = useCallback((currentCount) => {
    return isPremium || currentCount < APP_CONFIG.FREE_BUDGET_LIMIT;
  }, [isPremium]);

  const canCreateRecurring = useCallback((currentCount) => {
    return isPremium || currentCount < APP_CONFIG.FREE_RECURRING_LIMIT;
  }, [isPremium]);

  const canCreateGoal = useCallback((currentCount) => {
    return isPremium || currentCount < APP_CONFIG.FREE_GOAL_LIMIT;
  }, [isPremium]);

  const canSplitTransaction = isPremium;

  return (
    <SubscriptionContext.Provider value={{
      subscription,
      isPremium,
      isTrialing,
      trialDaysLeft,
      monthlyTransactionCount,
      canAddTransaction,
      transactionLimit: FREE_TRANSACTION_LIMIT,
      budgetLimit: APP_CONFIG.FREE_BUDGET_LIMIT,
      recurringLimit: APP_CONFIG.FREE_RECURRING_LIMIT,
      goalLimit: APP_CONFIG.FREE_GOAL_LIMIT,
      canCreateBudget,
      canCreateRecurring,
      canCreateGoal,
      canSplitTransaction,
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
