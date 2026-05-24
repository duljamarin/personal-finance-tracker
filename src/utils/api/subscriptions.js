import { withAuth, getSupabase } from './_auth';

export async function fetchSubscription() {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .rpc('get_subscription_status', { p_user_id: user.id });

    if (error) {
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
    const supabase = await getSupabase();
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

export async function deleteUserAccount() {
  return withAuth(async () => {
    const supabase = await getSupabase();
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
    const supabase = await getSupabase();
    const { error } = await supabase.rpc('check_trial_expiring_notifications', {
      p_user_id: user.id,
    });
    if (error) throw error;
  });
}

export async function startFreeTrial() {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
    const { error } = await supabase.rpc('start_free_trial', {
      p_user_id: user.id,
    });
    if (error) throw error;
  });
}
