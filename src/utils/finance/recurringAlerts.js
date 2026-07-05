// Client-side port of check_recurring_notifications. Notifies for active
// recurring transactions whose next_run_at falls within the user's advance
// window. Amount is rendered into the encrypted message; metadata holds only
// recurring_id + due_date for dedup.
import i18n from '../../i18n';
import { getSupabase } from '../api/_auth';
import { decryptRows } from '../crypto/rowCodec';
import { round2 } from './shared';
import { createNotificationDeduped } from './notify';

export async function checkRecurringNotifications(userId) {
  const supabase = await getSupabase();

  const { data: settings } = await supabase
    .from('notification_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  // Defaults mirror the SQL fallback when no settings row exists.
  const enabled = settings ? settings.recurring_due_enabled : true;
  const advanceDays = settings ? (settings.recurring_advance_days ?? 1) : 1;
  if (!enabled) return;

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const windowEnd = new Date(today.getTime() + advanceDays * 86400000)
    .toISOString()
    .slice(0, 10);

  const { data: raw, error } = await supabase
    .from('recurring_transactions')
    .select('id, title, amount, type, currency_code, next_run_at')
    .eq('user_id', userId)
    .eq('is_active', true)
    .gte('next_run_at', todayStr)
    .lte('next_run_at', `${windowEnd}T23:59:59`);
  if (error) throw error;

  const rows = await decryptRows('recurring_transactions', raw || []);

  for (const r of rows) {
    const dueDate = String(r.next_run_at).slice(0, 10);
    const amount = round2(Number(r.amount));

    await createNotificationDeduped(userId, {
      type: 'recurring_due',
      title: i18n.t('notifications.recurringDueTitle', { title: r.title }),
      message: i18n.t('notifications.recurringDueMessage', {
        title: r.title,
        currency: r.currency_code,
        amount,
        date: dueDate,
      }),
      metadata: { recurring_id: r.id, due_date: dueDate },
      dedup: { recurring_id: r.id, due_date: dueDate },
      windowHours: 24,
    });
  }
}
