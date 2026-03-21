import { supabase } from '../supabaseClient';
import { withAuth } from './_auth';

export async function fetchSubscription() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_subscription_status', { p_user_id: user.id });

    if (error) {
      // If function doesn't exist yet, return null gracefully
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        console.warn('Subscription functions not yet deployed.');
        return null;
      }
      throw error;
    }
    return data?.[0] || null;
  });
}

export async function getMonthlyTransactionCount() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .rpc('get_monthly_transaction_count', { p_user_id: user.id });

    if (error) {
      if (error.code === '42883' || error.message?.includes('does not exist')) {
        return 0;
      }
      throw error;
    }
    return data ?? 0;
  });
}

/**
 * Deletes the currently authenticated user's account and all associated data.
 * Cancels any active Paddle subscription, deletes all application data,
 * and removes the auth.users record — all handled by the delete-user Edge Function.
 */
export async function deleteUserAccount() {
  return withAuth(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('No active session');

    const response = await supabase.functions.invoke('delete-user', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });

    if (response.error) throw response.error;

    await supabase.auth.signOut();
  });
}

export async function checkTrialExpiringNotifications() {
  return withAuth(async (user) => {
    const { error } = await supabase.rpc('check_trial_expiring_notifications', {
      p_user_id: user.id,
    });
    if (error) throw error;
  });
}

/**
 * Starts a card-free 7-day trial for the current user.
 * No Paddle checkout required — trial is managed entirely in the DB.
 * Throws if user has already used their trial or is already subscribed.
 */
export async function startFreeTrial() {
  return withAuth(async (user) => {
    const { error } = await supabase.rpc('start_free_trial', {
      p_user_id: user.id,
    });
    if (error) throw error;
  });
}
