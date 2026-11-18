// ?plan=free renders the free-plan gating; default is premium.
const free = new URLSearchParams(location.search).get('plan') === 'free';
const VALUE = {
  subscription: { subscription_status: free ? 'none' : 'active' },
  isPremium: !free, isTrialing: false, trialDaysLeft: 0, trialEndsAt: null,
  monthlyTransactionCount: 24, canAddTransaction: true,
  transactionLimit: 30, budgetLimit: 10, recurringLimit: 20, goalLimit: 10,
  canCreateBudget: () => true, canCreateRecurring: () => true, canCreateGoal: () => true,
  canSplitTransaction: !free, hasHadTrial: false,
  startTrial: async () => {}, refreshSubscription: async () => {}, loading: false,
};
export function SubscriptionProvider({ children }) { return children; }
export function useSubscription() { return VALUE; }
