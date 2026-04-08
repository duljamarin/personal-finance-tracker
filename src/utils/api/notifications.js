import { supabase } from '../supabaseClient';
import { withAuth, withAuthOrEmpty } from './_auth';

export async function fetchNotifications() {
  return withAuthOrEmpty(async (user) => {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data || [];
  });
}

export async function markNotificationAsRead(id) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function markAllNotificationsAsRead() {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return 'OK';
  });
}

export async function deleteNotification(id) {
  return withAuth(async (user) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) throw error;
    return 'OK';
  });
}

export async function getUnreadNotificationCount() {
  return withAuth(async (user) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('is_read', false);

    if (error) throw error;
    return count || 0;
  });
}

export async function fetchNotificationSettings() {
  return withAuth(async (user) => {
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      // No settings row yet - return defaults
      if (error.code === 'PGRST116') return null;
      throw error;
    }
    return data;
  });
}

export async function updateNotificationSettings(settings) {
  return withAuth(async (user) => {
    const {
      email_enabled,
      budget_overrun_enabled,
      recurring_due_enabled,
      goal_milestone_enabled,
      trial_expiring_enabled,
      budget_threshold,
      recurring_advance_days,
      goal_milestone_percentage,
    } = settings;

    const payload = {
      user_id: user.id,
      email_enabled,
      budget_overrun_enabled,
      recurring_due_enabled,
      goal_milestone_enabled,
      trial_expiring_enabled,
      budget_threshold,
      recurring_advance_days,
      goal_milestone_percentage,
    };

    const { data, error } = await supabase
      .from('notification_settings')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) throw error;
    return data;
  });
}
