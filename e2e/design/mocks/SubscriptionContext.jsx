// ?plan=free renders the free-plan gating; ?plan=cancelled a premium plan
// that ends at period end; default is an active premium plan.
const plan = new URLSearchParams(location.search).get('plan');
const free = plan === 'free';
const VALUE = {
  subscription: free ? { subscription_status: 'none' } : {
    subscription_status: 'active', paddle_subscription_id: 'sub_demo', period_end: '2027-07-01T00:00:00Z',
    subscription_cancel_at: plan === 'cancelled' ? '2027-07-01T00:00:00Z' : null,
  },
  isPremium: !free, isTrialing: false, trialDaysLeft: 0, trialEndsAt: null,
  monthlyTransactionCount: 24, canAddTransaction: true,
  transactionLimit: 30, budgetLimit: 10, recurringLimit: 20, goalLimit: 10,
  canCreateBudget: () => true, canCreateRecurring: () => true, canCreateGoal: () => true,
  canSplitTransaction: !free, hasHadTrial: false,
  startTrial: async () => {}, refreshSubscription: async () => {}, loading: false,
};
export function SubscriptionProvider({ children }) { return children; }
export function useSubscription() { return VALUE; }
