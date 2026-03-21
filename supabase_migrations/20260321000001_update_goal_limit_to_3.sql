-- Migration: Update goal limit from 1 to 3 for free users
-- Date: 2026-03-21
-- Description: Increases the free tier goal limit from 1 to 3 active goals

-- Update the check_goal_limit function with new limit
CREATE OR REPLACE FUNCTION check_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  active_count    INTEGER;
  free_limit CONSTANT INTEGER := 3;  -- Updated from 1 to 3
BEGIN
  -- Check if user has an active/trialing subscription OR is within their paid period
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  -- Premium users have no limit
  IF user_is_premium THEN
    RETURN NEW;
  END IF;

  -- Count active non-completed goals
  SELECT COUNT(*) INTO active_count
  FROM public.goals
  WHERE user_id      = NEW.user_id
    AND is_active    = true
    AND is_completed = false;

  -- Check against free tier limit
  IF active_count >= free_limit THEN
    RAISE EXCEPTION 'Goal limit reached. Upgrade to premium for unlimited goals.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

-- Ensure the trigger is properly set up
DROP TRIGGER IF EXISTS enforce_goal_limit ON public.goals;
CREATE TRIGGER enforce_goal_limit
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION check_goal_limit();
