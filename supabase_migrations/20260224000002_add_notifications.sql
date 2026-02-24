-- Migration: Notifications System  
-- Description: Creates notifications and notification_settings tables

-- Notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notification_type text NOT NULL CHECK (
    notification_type IN ('budget_overrun', 'recurring_due', 'goal_milestone', 'trial_expiring', 'general')
  ),
  title text NOT NULL,
  message text NOT NULL,
  is_read boolean DEFAULT false NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Notification settings table (one row per user)
CREATE TABLE IF NOT EXISTS public.notification_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email_enabled boolean DEFAULT true NOT NULL,
  budget_overrun_enabled boolean DEFAULT true NOT NULL,
  recurring_due_enabled boolean DEFAULT true NOT NULL,
  goal_milestone_enabled boolean DEFAULT true NOT NULL,
  trial_expiring_enabled boolean DEFAULT true NOT NULL,
  budget_threshold integer DEFAULT 90 CHECK (budget_threshold BETWEEN 50 AND 100),
  recurring_advance_days integer DEFAULT 1 CHECK (recurring_advance_days BETWEEN 0 AND 7),
  goal_milestone_percentage integer DEFAULT 25 CHECK (goal_milestone_percentage BETWEEN 10 AND 50),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for notifications
CREATE POLICY "Users can manage their own notifications"
  ON public.notifications
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for notification_settings
CREATE POLICY "Users can manage their own notification settings"
  ON public.notification_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id_unread ON public.notifications(user_id, is_read) WHERE is_read = false;

-- updated_at trigger for notification_settings
CREATE OR REPLACE FUNCTION update_notification_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER notification_settings_updated_at
  BEFORE UPDATE ON public.notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_settings_updated_at();

-- Function to create a notification (used internally or by edge functions)
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id uuid,
  p_type text,
  p_title text,
  p_message text,
  p_metadata jsonb DEFAULT '{}'
)
RETURNS uuid AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO public.notifications (user_id, notification_type, title, message, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check and generate in-app budget overrun notifications
-- Called after each transaction insert/update via RPC
CREATE OR REPLACE FUNCTION check_budget_notifications(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_settings record;
  v_budget record;
  v_spent numeric;
  v_threshold_amount numeric;
  v_current_month text;
  v_already_notified boolean;
BEGIN
  -- Get notification settings (only proceed if budget overrun is enabled)
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND OR NOT v_settings.budget_overrun_enabled THEN
    RETURN;
  END IF;

  v_current_month := to_char(CURRENT_DATE, 'YYYY-MM');

  -- Check each active budget
  FOR v_budget IN
    SELECT b.id, b.category_id, b.amount as budget_amount,
           c.name as category_name
    FROM public.monthly_budgets b
    JOIN public.categories c ON c.id = b.category_id
    WHERE b.user_id = p_user_id
      AND b.month = v_current_month
  LOOP
    -- Calculate spent amount for this category this month
    SELECT COALESCE(SUM(base_amount), 0) INTO v_spent
    FROM public.transactions
    WHERE user_id = p_user_id
      AND category_id = v_budget.category_id
      AND type = 'expense'
      AND to_char(date::date, 'YYYY-MM') = v_current_month;

    v_threshold_amount := v_budget.budget_amount * v_settings.budget_threshold / 100.0;

    -- Only notify if spent >= threshold and no notification in last 3 days
    IF v_spent >= v_threshold_amount THEN
      SELECT EXISTS (
        SELECT 1 FROM public.notifications
        WHERE user_id = p_user_id
          AND notification_type = 'budget_overrun'
          AND (metadata->>'category_id') = v_budget.category_id::text
          AND (metadata->>'month') = v_current_month
          AND created_at > now() - interval '3 days'
      ) INTO v_already_notified;

      IF NOT v_already_notified THEN
        PERFORM create_notification(
          p_user_id,
          'budget_overrun',
          'Budget Alert: ' || v_budget.category_name,
          'You have spent ' || round(v_spent, 2) || ' of your ' || v_budget.budget_amount || ' budget (' || round(v_spent / v_budget.budget_amount * 100) || '%) for ' || v_budget.category_name,
          jsonb_build_object(
            'category_id', v_budget.category_id,
            'month', v_current_month,
            'spent', round(v_spent, 2),
            'budget', v_budget.budget_amount,
            'title_key', 'notifications.budgetAlertTitle',
            'title_params', jsonb_build_object('category', v_budget.category_name),
            'message_key', 'notifications.budgetAlertMessage',
            'message_params', jsonb_build_object(
              'category', v_budget.category_name,
              'spent', round(v_spent, 2),
              'budget', v_budget.budget_amount,
              'percent', round(v_spent / v_budget.budget_amount * 100)
            )
          )
        );
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
