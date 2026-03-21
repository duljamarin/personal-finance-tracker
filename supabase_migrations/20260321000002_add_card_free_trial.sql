-- Migration: Card-free 7-day trial
-- Allows users to start a trial directly without entering payment details.
-- Trial is tracked via the existing subscriptions table.
-- After 7 days, access reverts to free tier automatically.

-- 1. Function: start_free_trial
-- Called from frontend via RPC. Sets status='trialing' for 7 days.
-- Prevents double-trial via had_trial flag.
CREATE OR REPLACE FUNCTION start_free_trial(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_had_trial BOOLEAN;
  v_status TEXT;
BEGIN
  -- Only allow users to start their own trial
  IF p_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0003';
  END IF;

  -- Check current state
  SELECT had_trial, status INTO v_had_trial, v_status
  FROM subscriptions
  WHERE user_id = p_user_id;

  -- Cannot start trial if already had one
  IF v_had_trial THEN
    RAISE EXCEPTION 'Trial already used' USING ERRCODE = 'P0004';
  END IF;

  -- Cannot start trial if already on an active/trialing subscription
  IF v_status IN ('active', 'trialing') THEN
    RAISE EXCEPTION 'Already subscribed' USING ERRCODE = 'P0005';
  END IF;

  -- Start the trial
  UPDATE subscriptions
  SET
    status = 'trialing',
    trial_start = NOW(),
    trial_end = NOW() + INTERVAL '7 days',
    had_trial = TRUE,
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION start_free_trial(UUID) TO authenticated;

-- 2. Update get_subscription_status to auto-expire trials
-- When status='trialing' and trial_end < NOW(), treat as expired (not premium).
DROP FUNCTION IF EXISTS get_subscription_status(UUID);

CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
    subscription_status TEXT,
    subscription_plan TEXT,
    is_premium BOOLEAN,
    is_trialing BOOLEAN,
    trial_days_left INTEGER,
    period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    subscription_cancel_at TIMESTAMPTZ,
    paddle_subscription_id TEXT,
    had_trial BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Prevent users from querying other users' subscription status
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
            USING ERRCODE = 'P0003';
    END IF;

    RETURN QUERY
    SELECT
        -- If trialing but trial expired, report as 'none'
        CASE
            WHEN s.status = 'trialing' AND s.trial_end IS NOT NULL AND s.trial_end <= NOW()
            THEN 'none'::TEXT
            ELSE s.status
        END,
        s.plan,
        -- Premium if active, or trialing with valid trial, or cancelled/past_due with valid period
        (
            s.status = 'active'
            OR (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW()))
            OR (
                s.status IN ('past_due', 'cancelled')
                AND s.current_period_end IS NOT NULL
                AND s.current_period_end > NOW()
            )
        ) AS is_premium,
        -- Only trialing if trial is still valid
        (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW())) AS is_trialing,
        CASE WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW()
            THEN GREATEST(0, (DATE(s.trial_end AT TIME ZONE 'UTC') - CURRENT_DATE)::INTEGER)
            ELSE 0
        END AS trial_days_left,
        s.current_period_end,
        s.trial_end,
        s.cancel_at,
        s.paddle_subscription_id,
        s.had_trial
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
