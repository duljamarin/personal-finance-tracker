-- Migration: Fix goal milestone notifications when no notification_settings row exists
-- Root cause: the previous implementation did `IF NOT FOUND THEN RETURN` which silently
-- skipped all milestone checks for users who never visited the Notification Settings page.
-- Fix: fall back to the column defaults (goal_milestone_enabled=true, interval=25%).

CREATE OR REPLACE FUNCTION check_goal_milestone_notifications(p_user_id uuid, p_goal_id uuid)
RETURNS void AS $$
DECLARE
  v_settings    record;
  v_goal        record;
  v_progress    numeric;
  v_max_ms      integer;
  v_milestone   integer;
  v_already     boolean;
BEGIN
  -- 1. Get notification settings (fall back to defaults if no row yet)
  SELECT * INTO v_settings
  FROM public.notification_settings
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    -- User hasn't configured settings yet — use the column defaults
    v_settings.goal_milestone_enabled    := true;
    v_settings.goal_milestone_percentage := 25;
  END IF;

  IF NOT v_settings.goal_milestone_enabled THEN
    RETURN;
  END IF;

  -- 2. Fetch the goal (current_amount kept up to date by DB trigger on contributions)
  SELECT id, name, current_amount, target_amount
  INTO v_goal
  FROM public.goals
  WHERE id = p_goal_id
    AND user_id = p_user_id
    AND is_active = true;

  IF NOT FOUND OR v_goal.target_amount IS NULL OR v_goal.target_amount <= 0 THEN
    RETURN;
  END IF;

  -- 3. Calculate progress %
  v_progress := (v_goal.current_amount / v_goal.target_amount) * 100.0;

  -- 4. Highest milestone boundary crossed, capped at 100
  v_max_ms := LEAST(
    floor(v_progress / v_settings.goal_milestone_percentage)::integer
      * v_settings.goal_milestone_percentage,
    100
  );

  -- 5. Walk every milestone boundary and notify once per boundary
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
      PERFORM create_notification(
        p_user_id,
        'goal_milestone',
        v_milestone::text || '% reached — ' || v_goal.name,
        'You''ve reached ' || v_milestone || '% of your goal "' || v_goal.name
          || '" (' || round(v_goal.current_amount, 2)::text
          || ' / ' || v_goal.target_amount::text || ')',
        jsonb_build_object(
          'goal_id',       p_goal_id,
          'milestone_pct', v_milestone,
          'current',       round(v_goal.current_amount, 2),
          'target',        v_goal.target_amount,
          'name',          v_goal.name,
          'title_key',     'notifications.goalMilestoneTitle',
          'title_params',  jsonb_build_object(
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated role
GRANT EXECUTE ON FUNCTION check_goal_milestone_notifications(uuid, uuid) TO authenticated;
