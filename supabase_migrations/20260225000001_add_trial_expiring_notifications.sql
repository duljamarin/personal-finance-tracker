-- Migration: Trial Expiring Notifications
-- Description: Adds a DB function to generate in-app notifications when a user's trial
--              is about to expire (3 days before and 1 day before).
--              Call this function via RPC: SELECT check_trial_expiring_notifications(auth.uid())
--              This is called client-side on app load from SubscriptionContext.

CREATE OR REPLACE FUNCTION check_trial_expiring_notifications(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_settings     record;
  v_sub          record;
  v_days_left    integer;
  v_already_sent boolean;
  v_notif_day    integer; -- which day-threshold we're checking (3 or 1)
BEGIN
  -- Load notification settings
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  -- Skip if trial reminders disabled
  IF NOT FOUND OR NOT v_settings.trial_expiring_enabled THEN
    RETURN;
  END IF;

  -- Load subscription row
  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  -- Only relevant when user is in an active trial
  IF NOT FOUND OR v_sub.subscription_status != 'trialing' OR v_sub.trial_end IS NULL THEN
    RETURN;
  END IF;

  v_days_left := EXTRACT(DAY FROM (v_sub.trial_end::timestamptz - now()))::integer;

  -- Fire at 3 days and 1 day remaining
  FOREACH v_notif_day IN ARRAY ARRAY[3, 1] LOOP
    IF v_days_left = v_notif_day THEN
      -- Don't send duplicate for same day threshold
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id
          AND notification_type = 'trial_expiring'
          AND (metadata->>'days_left')::integer = v_notif_day
          AND created_at > now() - interval '20 hours'
      ) INTO v_already_sent;

      IF NOT v_already_sent THEN
        PERFORM create_notification(
          p_user_id,
          'trial_expiring',
          'Trial ends in ' || v_notif_day || ' day' || CASE WHEN v_notif_day > 1 THEN 's' ELSE '' END,
          'Your free trial expires on ' || to_char(v_sub.trial_end::date, 'Mon DD, YYYY') || '. Upgrade to keep access to all premium features.',
          jsonb_build_object(
            'days_left',     v_notif_day,
            'trial_end',     v_sub.trial_end,
            'title_key',     'notifications.trialExpiringTitle',
            'title_params',  jsonb_build_object('days', v_notif_day),
            'message_key',   'notifications.trialExpiringMessage',
            'message_params',jsonb_build_object(
              'date', to_char(v_sub.trial_end::date, 'Mon DD, YYYY')
            )
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated users (they can only check their own via p_user_id = auth.uid())
GRANT EXECUTE ON FUNCTION check_trial_expiring_notifications(uuid) TO authenticated;
