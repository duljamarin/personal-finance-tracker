import { withAuth, withAuthOrEmpty, getSupabase } from './_auth';
import { decryptField, isEncrypted } from '../crypto/cipher';
import { getDEK } from '../crypto/keyring';
import { decryptRows } from '../crypto/rowCodec';

// check_recurring_notifications / check_goal_milestone_notifications (server
// SQL) copy recurring.title / goal.name verbatim into these metadata params —
// they may be enc:v1: ciphertext for encryption-enabled users. The raw
// notification.title/.message columns embed the same text via string
// concatenation and are display fallback-only (legacy, left as-is).
async function decryptNotificationParams(notification) {
  const meta = notification.metadata;
  if (!meta || typeof meta !== 'object') return notification;

  const hasEncrypted =
    isEncrypted(meta.title_params?.title) ||
    isEncrypted(meta.title_params?.name) ||
    isEncrypted(meta.message_params?.title) ||
    isEncrypted(meta.message_params?.name);
  if (!hasEncrypted) return notification;

  const dek = await getDEK();
  const decryptParams = async (params) => {
    if (!params) return params;
    const out = { ...params };
    if (isEncrypted(out.title)) out.title = await decryptField(dek, out.title);
    if (isEncrypted(out.name)) out.name = await decryptField(dek, out.name);
    return out;
  };

  return {
    ...notification,
    metadata: {
      ...meta,
      title_params: await decryptParams(meta.title_params),
      message_params: await decryptParams(meta.message_params),
    },
  };
}

export async function fetchNotifications() {
  return withAuthOrEmpty(async (user) => {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    // Client-generated notifications store title/message ENCRYPTED (in
    // FIELD_MAP) — decrypt those columns first. decryptRows is tolerant of
    // legacy plaintext rows (server-created, pre-encryption). Then still run
    // decryptNotificationParams for older rows that carry ciphertext inside
    // metadata.*_params.
    const decrypted = await decryptRows('notifications', data || []);
    return Promise.all(decrypted.map(decryptNotificationParams));
  });
}

export async function markNotificationAsRead(id) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
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
    const supabase = await getSupabase();
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
    const supabase = await getSupabase();
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
    const supabase = await getSupabase();
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
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) throw error;
    return data;
  });
}

export async function updateNotificationSettings(settings) {
  return withAuth(async (user) => {
    const supabase = await getSupabase();
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
