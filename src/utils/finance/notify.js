// Client-side notification creation. Server RPCs used to build these with
// SECURITY DEFINER and embed plaintext amounts in the notifications.title /
// .message columns and in metadata.*_params. Now that amounts are E2E-
// encrypted we must not leak them to the server, so:
//   - title/message are rendered NOW (current i18n language) and stored
//     ENCRYPTED via encryptRow (notifications is in FIELD_MAP).
//   - metadata carries only non-sensitive routing/dedup keys (ids, month,
//     due_date, milestone_pct) — never amounts.
//   - No *_key is stored, so NotificationsPage falls back to the decrypted
//     title/message columns (see getNotificationText: meta.title_key
//     ? t(...) : notification.title).
import { getSupabase } from '../api/_auth';
import { encryptRow } from '../crypto/rowCodec';

// Insert a notification if an equivalent one doesn't already exist within the
// dedup window. `dedupMatch` is a partial metadata object matched with
// metadata->>key equality; `windowHours` limits by created_at.
export async function createNotificationDeduped(
  userId,
  { type, title, message, metadata = {}, dedup = {}, windowHours = 24 }
) {
  const supabase = await getSupabase();

  let query = supabase
    .from('notifications')
    .select('id', { head: false })
    .eq('user_id', userId)
    .eq('notification_type', type);

  for (const [k, v] of Object.entries(dedup)) {
    query = query.eq(`metadata->>${k}`, String(v));
  }
  if (windowHours) {
    const since = new Date(Date.now() - windowHours * 3600 * 1000).toISOString();
    query = query.gte('created_at', since);
  }

  const { data: existing, error: selError } = await query.limit(1);
  if (selError) throw selError;
  if (existing && existing.length > 0) return null; // already notified

  const row = await encryptRow('notifications', {
    user_id: userId,
    notification_type: type,
    title,
    message,
    metadata,
    is_read: false,
  });

  const { data, error } = await supabase
    .from('notifications')
    .insert(row)
    .select('id')
    .single();

  if (error) throw error;

  // Signal the sidebar unread badge to refetch immediately. Realtime postgres
  // changes also cover this, but the event fires synchronously in-tab so the
  // count updates without waiting for the realtime round-trip (or when
  // realtime replication isn't active for this table).
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('notifications:changed'));
  }

  return data?.id ?? null;
}
