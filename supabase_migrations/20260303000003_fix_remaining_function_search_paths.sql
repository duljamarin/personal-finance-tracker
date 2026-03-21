-- supabase_migrations/20260303000003_fix_remaining_function_search_paths.sql
-- Description: Extends the search_path security fix to ALL remaining PostgreSQL functions
--              not covered in 20260303000002. Every function is recreated with
--              SET search_path = '' and fully-qualified public.table_name references.
--              No logic changes — purely a security hardening migration.

-- ============================================================
-- 1. update_notification_settings_updated_at  (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- 2. create_notification
-- ============================================================
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id  uuid,
  p_type     text,
  p_title    text,
  p_message  text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, notification_type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_notification(uuid, text, text, text, jsonb) TO authenticated;

-- ============================================================
-- 3. upsert_net_worth_snapshot
-- ============================================================
CREATE OR REPLACE FUNCTION upsert_net_worth_snapshot(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_total_assets      numeric;
  v_total_liabilities numeric;
BEGIN
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_assets
  FROM public.assets
  WHERE user_id = p_user_id AND type = 'asset';

  SELECT COALESCE(SUM(current_value), 0) INTO v_total_liabilities
  FROM public.assets
  WHERE user_id = p_user_id AND type = 'liability';

  INSERT INTO public.net_worth_snapshots (user_id, snapshot_date, total_assets, total_liabilities, net_worth)
  VALUES (p_user_id, CURRENT_DATE, v_total_assets, v_total_liabilities, v_total_assets - v_total_liabilities)
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    total_assets      = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    net_worth         = EXCLUDED.net_worth;
END;
$$;

GRANT EXECUTE ON FUNCTION upsert_net_worth_snapshot(uuid) TO authenticated;

-- ============================================================
-- 4. check_recurring_notifications
-- ============================================================
CREATE OR REPLACE FUNCTION check_recurring_notifications(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings         record;
  v_recurring        record;
  v_already_notified boolean;
  v_due_date         date;
BEGIN
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  -- Fall back to defaults if no settings row yet
  IF NOT FOUND THEN
    v_settings.recurring_due_enabled  := true;
    v_settings.recurring_advance_days := 1;
  END IF;

  IF NOT v_settings.recurring_due_enabled THEN
    RETURN;
  END IF;

  FOR v_recurring IN
    SELECT rt.id, rt.title, rt.amount, rt.type, rt.currency_code, rt.next_run_at,
           c.name AS category_name
    FROM public.recurring_transactions rt
    LEFT JOIN public.categories c ON c.id = rt.category_id
    WHERE rt.user_id   = p_user_id
      AND rt.is_active = true
      AND rt.next_run_at::date <= (CURRENT_DATE + v_settings.recurring_advance_days)
      AND rt.next_run_at::date >= CURRENT_DATE
  LOOP
    v_due_date := v_recurring.next_run_at::date;

    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id             = p_user_id
        AND notification_type   = 'recurring_due'
        AND (metadata->>'recurring_id') = v_recurring.id::text
        AND (metadata->>'due_date')     = v_due_date::text
        AND created_at > now() - interval '1 day'
    ) INTO v_already_notified;

    IF NOT v_already_notified THEN
      PERFORM public.create_notification(
        p_user_id,
        'recurring_due',
        'Upcoming: ' || v_recurring.title,
        'Your recurring transaction "' || v_recurring.title || '" (' ||
          v_recurring.currency_code || ' ' || round(v_recurring.amount, 2) ||
          ') is due on ' || to_char(v_due_date, 'YYYY-MM-DD') || '.',
        jsonb_build_object(
          'recurring_id',   v_recurring.id,
          'due_date',       v_due_date,
          'amount',         round(v_recurring.amount, 2),
          'currency_code',  v_recurring.currency_code,
          'title_key',      'notifications.recurringDueTitle',
          'title_params',   jsonb_build_object('title', v_recurring.title),
          'message_key',    'notifications.recurringDueMessage',
          'message_params', jsonb_build_object(
            'title',    v_recurring.title,
            'currency', v_recurring.currency_code,
            'amount',   round(v_recurring.amount, 2),
            'date',     to_char(v_due_date, 'YYYY-MM-DD')
          )
        )
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_recurring_notifications(uuid) TO authenticated;

-- ============================================================
-- 5. check_budget_notifications  (most recent: 20260224000005)
-- ============================================================
CREATE OR REPLACE FUNCTION check_budget_notifications(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings          record;
  v_budget            record;
  v_spent             numeric;
  v_threshold_amount  numeric;
  v_current_year      integer;
  v_current_month     integer;
  v_current_month_key text;
  v_already_notified  boolean;
BEGIN
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND OR NOT v_settings.budget_overrun_enabled THEN
    RETURN;
  END IF;

  v_current_year      := EXTRACT(YEAR  FROM CURRENT_DATE)::integer;
  v_current_month     := EXTRACT(MONTH FROM CURRENT_DATE)::integer;
  v_current_month_key := to_char(CURRENT_DATE, 'YYYY-MM');

  FOR v_budget IN
    SELECT b.id, b.category_id, b.amount AS budget_amount,
           c.name AS category_name
    FROM public.budgets b
    JOIN public.categories c ON c.id = b.category_id
    WHERE b.user_id = p_user_id
      AND b.year   = v_current_year
      AND b.month  = v_current_month
  LOOP
    SELECT
      COALESCE(
        (SELECT SUM(t.base_amount)
         FROM public.transactions t
         WHERE t.user_id     = p_user_id
           AND t.category_id = v_budget.category_id
           AND t.type        = 'expense'
           AND EXTRACT(YEAR  FROM t.date::date) = v_current_year
           AND EXTRACT(MONTH FROM t.date::date) = v_current_month),
        0
      ) +
      COALESCE(
        (SELECT SUM(ts.amount * COALESCE(t.exchange_rate, 1.0))
         FROM public.transaction_splits ts
         JOIN public.transactions t ON t.id = ts.transaction_id
         WHERE ts.user_id     = p_user_id
           AND ts.category_id = v_budget.category_id
           AND t.type         = 'expense'
           AND EXTRACT(YEAR  FROM t.date::date) = v_current_year
           AND EXTRACT(MONTH FROM t.date::date) = v_current_month),
        0
      ) INTO v_spent;

    v_threshold_amount := v_budget.budget_amount * v_settings.budget_threshold / 100.0;

    IF v_spent >= v_threshold_amount THEN
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id              = p_user_id
          AND notification_type   = 'budget_overrun'
          AND (metadata->>'category_id') = v_budget.category_id::text
          AND (metadata->>'month')        = v_current_month_key
          AND created_at > now() - interval '3 days'
      ) INTO v_already_notified;

      IF NOT v_already_notified THEN
        PERFORM public.create_notification(
          p_user_id,
          'budget_overrun',
          'Budget Alert: ' || v_budget.category_name,
          'You have spent ' || round(v_spent, 2) || ' of your ' || v_budget.budget_amount
            || ' budget (' || round(v_spent / v_budget.budget_amount * 100) || '%) for '
            || v_budget.category_name,
          jsonb_build_object(
            'category_id',    v_budget.category_id,
            'month',          v_current_month_key,
            'spent',          round(v_spent, 2),
            'budget',         v_budget.budget_amount,
            'title_key',      'notifications.budgetAlertTitle',
            'title_params',   jsonb_build_object('category', v_budget.category_name),
            'message_key',    'notifications.budgetAlertMessage',
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
$$;

GRANT EXECUTE ON FUNCTION check_budget_notifications(uuid) TO authenticated;

-- ============================================================
-- 6. check_goal_milestone_notifications  (most recent: 20260225000002)
-- ============================================================
CREATE OR REPLACE FUNCTION check_goal_milestone_notifications(p_user_id uuid, p_goal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings  record;
  v_goal      record;
  v_progress  numeric;
  v_max_ms    integer;
  v_milestone integer;
  v_already   boolean;
BEGIN
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- Use column defaults when no settings row exists yet
    v_settings.goal_milestone_enabled    := true;
    v_settings.goal_milestone_percentage := 25;
  END IF;

  IF NOT v_settings.goal_milestone_enabled THEN
    RETURN;
  END IF;

  SELECT id, name, current_amount, target_amount
  INTO v_goal
  FROM public.goals
  WHERE id       = p_goal_id
    AND user_id  = p_user_id
    AND is_active = true;

  IF NOT FOUND OR v_goal.target_amount IS NULL OR v_goal.target_amount <= 0 THEN
    RETURN;
  END IF;

  v_progress := (v_goal.current_amount / v_goal.target_amount) * 100.0;

  v_max_ms := LEAST(
    floor(v_progress / v_settings.goal_milestone_percentage)::integer
      * v_settings.goal_milestone_percentage,
    100
  );

  v_milestone := v_settings.goal_milestone_percentage;
  WHILE v_milestone <= v_max_ms LOOP

    SELECT EXISTS (
      SELECT 1 FROM public.notifications
      WHERE user_id             = p_user_id
        AND notification_type   = 'goal_milestone'
        AND (metadata->>'goal_id')       = p_goal_id::text
        AND (metadata->>'milestone_pct') = v_milestone::text
    ) INTO v_already;

    IF NOT v_already THEN
      PERFORM public.create_notification(
        p_user_id,
        'goal_milestone',
        v_milestone::text || '% reached — ' || v_goal.name,
        'You''ve reached ' || v_milestone || '% of your goal "' || v_goal.name
          || '" (' || round(v_goal.current_amount, 2)::text
          || ' / ' || v_goal.target_amount::text || ')',
        jsonb_build_object(
          'goal_id',        p_goal_id,
          'milestone_pct',  v_milestone,
          'current',        round(v_goal.current_amount, 2),
          'target',         v_goal.target_amount,
          'name',           v_goal.name,
          'title_key',      'notifications.goalMilestoneTitle',
          'title_params',   jsonb_build_object(
            'percent', v_milestone,
            'name',    v_goal.name
          ),
          'message_key',    'notifications.goalMilestoneMessage',
          'message_params', jsonb_build_object(
            'percent',  v_milestone,
            'name',     v_goal.name,
            'current',  round(v_goal.current_amount, 2),
            'target',   v_goal.target_amount
          )
        )
      );
    END IF;

    v_milestone := v_milestone + v_settings.goal_milestone_percentage;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_goal_milestone_notifications(uuid, uuid) TO authenticated;

-- ============================================================
-- 7. check_trial_expiring_notifications
-- ============================================================
CREATE OR REPLACE FUNCTION check_trial_expiring_notifications(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_settings     record;
  v_sub          record;
  v_days_left    integer;
  v_already_sent boolean;
  v_notif_day    integer;
BEGIN
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND OR NOT v_settings.trial_expiring_enabled THEN
    RETURN;
  END IF;

  SELECT * INTO v_sub
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND OR v_sub.status != 'trialing' OR v_sub.trial_end IS NULL THEN
    RETURN;
  END IF;

  v_days_left := EXTRACT(DAY FROM (v_sub.trial_end::timestamptz - now()))::integer;

  FOREACH v_notif_day IN ARRAY ARRAY[3, 1] LOOP
    IF v_days_left = v_notif_day THEN
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id             = p_user_id
          AND notification_type   = 'trial_expiring'
          AND (metadata->>'days_left')::integer = v_notif_day
          AND created_at > now() - interval '20 hours'
      ) INTO v_already_sent;

      IF NOT v_already_sent THEN
        PERFORM public.create_notification(
          p_user_id,
          'trial_expiring',
          'Trial ends in ' || v_notif_day || ' day' || CASE WHEN v_notif_day > 1 THEN 's' ELSE '' END,
          'Your free trial expires on ' || to_char(v_sub.trial_end::date, 'Mon DD, YYYY') || '. Upgrade to keep access to all premium features.',
          jsonb_build_object(
            'days_left',      v_notif_day,
            'trial_end',      v_sub.trial_end,
            'title_key',      'notifications.trialExpiringTitle',
            'title_params',   jsonb_build_object('days', v_notif_day),
            'message_key',    'notifications.trialExpiringMessage',
            'message_params', jsonb_build_object(
              'date', to_char(v_sub.trial_end::date, 'Mon DD, YYYY')
            )
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION check_trial_expiring_notifications(uuid) TO authenticated;

-- ============================================================
-- 8. get_subscription_status  (most recent: 20260301000001 — includes trial_end column)
--    Must DROP first because the return type (OUT columns) changed across migrations.
-- ============================================================
DROP FUNCTION IF EXISTS get_subscription_status(UUID);

CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
  subscription_status      TEXT,
  subscription_plan        TEXT,
  is_premium               BOOLEAN,
  is_trialing              BOOLEAN,
  trial_days_left          INTEGER,
  period_end               TIMESTAMPTZ,
  trial_end                TIMESTAMPTZ,
  subscription_cancel_at   TIMESTAMPTZ,
  paddle_subscription_id   TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Prevent users from querying other users' subscription status
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
      USING ERRCODE = 'P0003';
  END IF;

  RETURN QUERY
  SELECT
    s.status,
    s.plan,
    (
      s.status IN ('active', 'trialing')
      OR (
        s.status IN ('past_due', 'cancelled')
        AND s.current_period_end IS NOT NULL
        AND s.current_period_end > NOW()
      )
    ) AS is_premium,
    (s.status = 'trialing') AS is_trialing,
    CASE WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW()
      -- Calendar-day difference: e.g. Mar 1 - Feb 25 = 4
      THEN GREATEST(0, (DATE(s.trial_end AT TIME ZONE 'UTC') - CURRENT_DATE)::INTEGER)
      ELSE 0
    END AS trial_days_left,
    s.current_period_end,
    s.trial_end,
    s.cancel_at,
    s.paddle_subscription_id
  FROM public.subscriptions s
  WHERE s.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;

-- ============================================================
-- 9. get_monthly_transaction_count
-- ============================================================
CREATE OR REPLACE FUNCTION get_monthly_transaction_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tx_count INTEGER;
BEGIN
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: cannot access another user''s data'
      USING ERRCODE = 'P0003';
  END IF;

  SELECT COUNT(*) INTO tx_count
  FROM public.transactions
  WHERE user_id = p_user_id
    AND date >= date_trunc('month', CURRENT_DATE)::DATE
    AND date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;

  RETURN tx_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_monthly_transaction_count(UUID) TO authenticated;

-- ============================================================
-- 10. seed_default_categories_for_user
--     (previously had SET search_path = public — tightened to '')
-- ============================================================
CREATE OR REPLACE FUNCTION seed_default_categories_for_user(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.categories (user_id, name, emoji)
  VALUES
    (p_user_id, 'Entertainment',     '🎭'),
    (p_user_id, 'Food & Dining',     '🍽️'),
    (p_user_id, 'Healthcare',        '🏥'),
    (p_user_id, 'Investments',       '📈'),
    (p_user_id, 'Salary',            '💼'),
    (p_user_id, 'Shopping',          '🛍️'),
    (p_user_id, 'Transportation',    '🚗'),
    (p_user_id, 'Utilities',         '💡'),
    (p_user_id, 'Housing & Rent',    '🏠'),
    (p_user_id, 'Education',         '📚'),
    (p_user_id, 'Travel',            '✈️'),
    (p_user_id, 'Personal Care',     '💆'),
    (p_user_id, 'Subscriptions',     '📱'),
    (p_user_id, 'Gifts & Donations', '🎁'),
    (p_user_id, 'Insurance',         '🛡️'),
    (p_user_id, 'Pets',              '🐾'),
    (p_user_id, 'Sports & Fitness',  '🏋️'),
    (p_user_id, 'Coffee & Snacks',   '☕'),
    (p_user_id, 'Freelance',         '💻'),
    (p_user_id, 'Savings',           '💰'),
    (p_user_id, 'Taxes',             '🧾'),
    (p_user_id, 'Communication',     '📞'),
    (p_user_id, 'Home & Garden',     '🏡'),
    (p_user_id, 'Kids & Family',     '👨‍👩‍👧')
  ON CONFLICT (user_id, name) DO NOTHING;
END;
$$;

GRANT EXECUTE ON FUNCTION seed_default_categories_for_user(UUID) TO service_role, postgres;

-- ============================================================
-- 11. create_default_categories_for_new_user  (trigger function)
--     (previously had SET search_path = public — tightened to '')
--     Calls public.seed_default_categories_for_user explicitly.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created_categories ON auth.users;
DROP FUNCTION IF EXISTS create_default_categories_for_new_user();

CREATE OR REPLACE FUNCTION create_default_categories_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    PERFORM public.seed_default_categories_for_user(NEW.id);
    RAISE LOG 'Created default categories for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create categories for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_categories
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_default_categories_for_new_user();

-- ============================================================
-- 12. create_subscription_for_new_user  (trigger function)
--     (previously had SET search_path = public — tightened to '')
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP FUNCTION IF EXISTS create_subscription_for_new_user();

CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  BEGIN
    INSERT INTO public.subscriptions (user_id, status)
    VALUES (NEW.id, 'none')
    ON CONFLICT (user_id) DO NOTHING;

    RAISE LOG 'Created subscription for user %', NEW.id;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_subscription_for_new_user();

-- ============================================================
-- 13. get_category_benchmarks
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_benchmarks(
  p_user_id UUID,
  p_months  INTEGER DEFAULT 6
)
RETURNS TABLE (
  category_id             UUID,
  category_name           TEXT,
  avg_monthly_spending    NUMERIC,
  std_deviation           NUMERIC,
  lower_threshold         NUMERIC,
  upper_threshold         NUMERIC,
  current_month_spending  NUMERIC,
  months_with_data        INTEGER,
  status                  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_month_start DATE;
  v_period_start        DATE;
BEGIN
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_start        := (v_current_month_start - (p_months || ' months')::INTERVAL)::DATE;

  RETURN QUERY
  WITH monthly_spending AS (
    SELECT
      t.category_id,
      DATE_TRUNC('month', t.date::DATE) AS month,
      SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS total_amount
    FROM public.transactions t
    WHERE t.user_id       = p_user_id
      AND t.type          = 'expense'
      AND t.date::DATE    < v_current_month_start
      AND t.category_id   IS NOT NULL
      AND t.is_scheduled  = false
    GROUP BY t.category_id, DATE_TRUNC('month', t.date::DATE)
  ),
  ranked_months AS (
    SELECT
      ms.category_id,
      ms.month,
      ms.total_amount,
      ROW_NUMBER() OVER (PARTITION BY ms.category_id ORDER BY ms.month DESC) AS month_rank
    FROM monthly_spending ms
  ),
  category_stats AS (
    SELECT
      rm.category_id,
      AVG(rm.total_amount)                    AS avg_spending,
      COALESCE(STDDEV_POP(rm.total_amount), 0) AS std_dev,
      COUNT(*)::INTEGER                        AS data_months
    FROM ranked_months rm
    WHERE rm.month_rank <= p_months
    GROUP BY rm.category_id
    HAVING COUNT(*) >= 1
  ),
  current_spending AS (
    SELECT
      t.category_id,
      SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS current_amount
    FROM public.transactions t
    WHERE t.user_id      = p_user_id
      AND t.type         = 'expense'
      AND t.date::DATE   >= v_current_month_start
      AND t.date::DATE   <  (v_current_month_start + INTERVAL '1 month')::DATE
      AND t.category_id  IS NOT NULL
      AND t.is_scheduled = false
    GROUP BY t.category_id
  )
  SELECT
    COALESCE(cs.category_id, curr.category_id)                           AS category_id,
    c.name                                                               AS category_name,
    COALESCE(ROUND(cs.avg_spending, 2), 0)                               AS avg_monthly_spending,
    COALESCE(ROUND(cs.std_dev, 2), 0)                                    AS std_deviation,
    COALESCE(ROUND(GREATEST(0, cs.avg_spending - cs.std_dev), 2), 0)     AS lower_threshold,
    COALESCE(ROUND(cs.avg_spending + cs.std_dev, 2), 0)                  AS upper_threshold,
    COALESCE(ROUND(curr.current_amount, 2), 0)                           AS current_month_spending,
    COALESCE(cs.data_months, 0)                                          AS months_with_data,
    CASE
      WHEN cs.category_id IS NULL                                                 THEN 'new'
      WHEN COALESCE(curr.current_amount, 0) < GREATEST(0, cs.avg_spending - cs.std_dev) THEN 'below'
      WHEN COALESCE(curr.current_amount, 0) > cs.avg_spending + cs.std_dev       THEN 'above'
      ELSE 'within'
    END AS status
  FROM category_stats cs
  FULL OUTER JOIN current_spending curr ON cs.category_id = curr.category_id
  JOIN public.categories c ON c.id = COALESCE(cs.category_id, curr.category_id)
  WHERE c.user_id = p_user_id
  ORDER BY COALESCE(cs.avg_spending, curr.current_amount, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_category_benchmarks(UUID, INTEGER) TO authenticated;

-- ============================================================
-- 14. check_budget_limit  (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION check_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  budget_count    INTEGER;
  free_limit CONSTANT INTEGER := 3;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO budget_count
  FROM public.budgets
  WHERE user_id = NEW.user_id
    AND year    = NEW.year
    AND month   = NEW.month;

  IF budget_count >= free_limit THEN
    RAISE EXCEPTION 'Budget limit reached. Upgrade to premium for unlimited budgets.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_budget_limit ON public.budgets;
CREATE TRIGGER enforce_budget_limit
  BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION check_budget_limit();

-- ============================================================
-- 15. check_recurring_limit  (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION check_recurring_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  active_count    INTEGER;
  free_limit CONSTANT INTEGER := 5;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.recurring_transactions
  WHERE user_id   = NEW.user_id
    AND is_active = true;

  IF active_count >= free_limit THEN
    RAISE EXCEPTION 'Recurring transaction limit reached. Upgrade to premium for unlimited recurring transactions.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_recurring_limit ON public.recurring_transactions;
CREATE TRIGGER enforce_recurring_limit
  BEFORE INSERT ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION check_recurring_limit();

-- ============================================================
-- 16. check_goal_limit  (trigger function)
-- ============================================================
CREATE OR REPLACE FUNCTION check_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  active_count    INTEGER;
  free_limit CONSTANT INTEGER := 3;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.goals
  WHERE user_id      = NEW.user_id
    AND is_active    = true
    AND is_completed = false;

  IF active_count >= free_limit THEN
    RAISE EXCEPTION 'Goal limit reached. Upgrade to premium for unlimited goals.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_goal_limit ON public.goals;
CREATE TRIGGER enforce_goal_limit
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION check_goal_limit();

-- ============================================================
-- 17. delete_user_account
--     (previously had SET search_path = public — tightened to '')
--     All table references are already fully qualified with public.
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- goal_milestones has no user_id column; delete via goal_id
  DELETE FROM public.goal_milestones
    WHERE goal_id IN (SELECT id FROM public.goals WHERE user_id = _user_id);

  DELETE FROM public.goal_contributions  WHERE user_id = _user_id;
  DELETE FROM public.goals               WHERE user_id = _user_id;
  DELETE FROM public.transaction_splits  WHERE user_id = _user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = _user_id;
  DELETE FROM public.transactions        WHERE user_id = _user_id;
  DELETE FROM public.categories          WHERE user_id = _user_id;
  DELETE FROM public.budgets             WHERE user_id = _user_id;
  DELETE FROM public.financial_health_scores WHERE user_id = _user_id;
  DELETE FROM public.net_worth_snapshots WHERE user_id = _user_id;
  DELETE FROM public.assets              WHERE user_id = _user_id;
  DELETE FROM public.notifications       WHERE user_id = _user_id;
  DELETE FROM public.notification_settings WHERE user_id = _user_id;
  DELETE FROM public.subscriptions       WHERE user_id = _user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
