-- Migration: Recurring Due Notifications
-- Adds a function to generate in-app notifications for upcoming recurring transactions

CREATE OR REPLACE FUNCTION check_recurring_notifications(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_settings record;
  v_recurring record;
  v_already_notified boolean;
  v_due_date date;
  v_title_key text;
  v_message_key text;
BEGIN
  -- Get notification settings
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  -- If no settings row yet, use defaults (enabled=true, advance_days=1)
  IF NOT FOUND THEN
    v_settings.recurring_due_enabled := true;
    v_settings.recurring_advance_days := 1;
  END IF;

  IF NOT v_settings.recurring_due_enabled THEN
    RETURN;
  END IF;

  -- Find all active recurring transactions whose next_run_at falls
  -- within now .. now + recurring_advance_days
  FOR v_recurring IN
    SELECT rt.id, rt.title, rt.amount, rt.type, rt.currency_code, rt.next_run_at,
           c.name as category_name
    FROM public.recurring_transactions rt
    LEFT JOIN public.categories c ON c.id = rt.category_id
    WHERE rt.user_id = p_user_id
      AND rt.is_active = true
      AND rt.next_run_at::date <= (CURRENT_DATE + v_settings.recurring_advance_days)
      AND rt.next_run_at::date >= CURRENT_DATE
  LOOP
    v_due_date := v_recurring.next_run_at::date;

    -- Avoid duplicates: skip if a notification for this recurring+date already exists today
    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id = p_user_id
        AND notification_type = 'recurring_due'
        AND (metadata->>'recurring_id') = v_recurring.id::text
        AND (metadata->>'due_date') = v_due_date::text
        AND created_at > now() - interval '1 day'
    ) INTO v_already_notified;

    IF NOT v_already_notified THEN
      PERFORM create_notification(
        p_user_id,
        'recurring_due',
        'Upcoming: ' || v_recurring.title,
        'Your recurring transaction "' || v_recurring.title || '" (' ||
          v_recurring.currency_code || ' ' || round(v_recurring.amount, 2) ||
          ') is due on ' || to_char(v_due_date, 'YYYY-MM-DD') || '.',
        jsonb_build_object(
          'recurring_id', v_recurring.id,
          'due_date', v_due_date,
          'amount', round(v_recurring.amount, 2),
          'currency_code', v_recurring.currency_code,
          'title_key', 'notifications.recurringDueTitle',
          'title_params', jsonb_build_object('title', v_recurring.title),
          'message_key', 'notifications.recurringDueMessage',
          'message_params', jsonb_build_object(
            'title', v_recurring.title,
            'currency', v_recurring.currency_code,
            'amount', round(v_recurring.amount, 2),
            'date', to_char(v_due_date, 'YYYY-MM-DD')
          )
        )
      );
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
