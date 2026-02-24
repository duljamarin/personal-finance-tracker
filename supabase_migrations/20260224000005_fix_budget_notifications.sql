-- ============================================
-- Fix check_budget_notifications function
-- Bugs fixed:
--   1. Wrong table name: monthly_budgets → budgets
--   2. Wrong month filter: text 'YYYY-MM' comparison → integer year/month columns
-- ============================================

CREATE OR REPLACE FUNCTION check_budget_notifications(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_settings record;
  v_budget record;
  v_spent numeric;
  v_threshold_amount numeric;
  v_current_year integer;
  v_current_month integer;
  v_current_month_key text;
  v_already_notified boolean;
BEGIN
  -- Get notification settings (only proceed if budget overrun is enabled)
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND OR NOT v_settings.budget_overrun_enabled THEN
    RETURN;
  END IF;

  v_current_year  := EXTRACT(YEAR  FROM CURRENT_DATE)::integer;
  v_current_month := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  -- Key used for dedup metadata (e.g. "2026-02")
  v_current_month_key := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Check each active budget for the current year/month
  FOR v_budget IN
    SELECT b.id, b.category_id, b.amount AS budget_amount,
           c.name AS category_name
    FROM public.budgets b
    JOIN public.categories c ON c.id = b.category_id
    WHERE b.user_id = p_user_id
      AND b.year  = v_current_year
      AND b.month = v_current_month
  LOOP
    -- Calculate total spent for this category this month
    -- Includes direct transactions AND individual split amounts for this category
    SELECT
      COALESCE(
        (SELECT SUM(t.base_amount)
         FROM public.transactions t
         WHERE t.user_id      = p_user_id
           AND t.category_id  = v_budget.category_id
           AND t.type         = 'expense'
           AND EXTRACT(YEAR  FROM t.date::date) = v_current_year
           AND EXTRACT(MONTH FROM t.date::date) = v_current_month),
        0
      ) +
      COALESCE(
        (SELECT SUM(ts.amount * COALESCE(t.exchange_rate, 1.0))
         FROM public.transaction_splits ts
         JOIN public.transactions t ON t.id = ts.transaction_id
         WHERE ts.user_id      = p_user_id
           AND ts.category_id  = v_budget.category_id
           AND t.type          = 'expense'
           AND EXTRACT(YEAR  FROM t.date::date) = v_current_year
           AND EXTRACT(MONTH FROM t.date::date) = v_current_month),
        0
      ) INTO v_spent;

    v_threshold_amount := v_budget.budget_amount * v_settings.budget_threshold / 100.0;

    -- Only notify if spent >= threshold
    IF v_spent >= v_threshold_amount THEN
      -- Dedup: skip if a notification for this category+month was sent within 3 days
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id          = p_user_id
          AND notification_type = 'budget_overrun'
          AND (metadata->>'category_id') = v_budget.category_id::text
          AND (metadata->>'month')        = v_current_month_key
          AND created_at > now() - interval '3 days'
      ) INTO v_already_notified;

      IF NOT v_already_notified THEN
        PERFORM create_notification(
          p_user_id,
          'budget_overrun',
          'Budget Alert: ' || v_budget.category_name,
          'You have spent ' || round(v_spent, 2) || ' of your ' || v_budget.budget_amount
            || ' budget (' || round(v_spent / v_budget.budget_amount * 100) || '%) for '
            || v_budget.category_name,
          jsonb_build_object(
            'category_id',   v_budget.category_id,
            'month',         v_current_month_key,
            'spent',         round(v_spent, 2),
            'budget',        v_budget.budget_amount,
            'title_key',     'notifications.budgetAlertTitle',
            'title_params',  jsonb_build_object('category', v_budget.category_name),
            'message_key',   'notifications.budgetAlertMessage',
            'message_params', jsonb_build_object(
              'category', v_budget.category_name,
              'spent',    round(v_spent, 2),
              'budget',   v_budget.budget_amount,
              'percent',  round(v_spent / v_budget.budget_amount * 100)
            )
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
