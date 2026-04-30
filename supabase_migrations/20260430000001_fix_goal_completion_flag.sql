-- Fix: restore is_completed logic to update_goal_current_amount trigger.
-- The security refactor in 20260303000002 rewrote this function but
-- accidentally dropped the is_completed / completed_at updates.

CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    total_contributions NUMERIC;
    goal_target NUMERIC;
    goal_completed BOOLEAN;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_contributions
    FROM public.goal_contributions
    WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id);

    SELECT target_amount, is_completed
    INTO goal_target, goal_completed
    FROM public.goals
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);

    UPDATE public.goals
    SET current_amount = total_contributions,
        is_completed   = (total_contributions >= goal_target),
        completed_at   = CASE
                           WHEN total_contributions >= goal_target AND NOT goal_completed THEN NOW()
                           WHEN total_contributions < goal_target THEN NULL
                           ELSE completed_at
                         END,
        updated_at     = NOW()
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);

    RETURN COALESCE(NEW, OLD);
END;
$$;
