// ?plan=free renders the free-plan gating; ?plan=cancelled a premium plan
// that ends at period end; default is an active premium plan.
import { subscriptionFor } from './fixtures';

const plan = new URLSearchParams(location.search).get('plan');
const free = plan === 'free';
const VALUE = {
  subscription: subscriptionFor(plan),
  isPremium: !free, isTrialing: false, trialDaysLeft: 0, trialEndsAt: null,
  monthlyTransactionCount: 24, canAddTransaction: true,
  transactionLimit: 30, budgetLimit: 10, recurringLimit: 20, goalLimit: 10,
  canCreateBudget: () => true, canCreateRecurring: () => true, canCreateGoal: () => true,
  canSplitTransaction: !free, hasHadTrial: false,
  startTrial: async () => {}, refreshSubscription: async () => {}, loading: false,
};
export function SubscriptionProvider({ children }) { return children; }
export function useSubscription() { return VALUE; }
