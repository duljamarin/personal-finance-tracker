-- Migration: Auto-expire trialing subscriptions in the database
-- Problem: When a card-free trial ends and the user doesn't subscribe,
--          the status column in subscriptions remains 'trialing' forever.
--          get_subscription_status masks this at query time but the raw DB is stale.
-- Fix: Update get_subscription_status to also UPDATE the row when it detects
--      an expired trial, so the database stays consistent.

-- Add 'expired' to the status check constraint
ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check;
ALTER TABLE subscriptions ADD CONSTRAINT subscriptions_status_check
    CHECK (status IN ('none', 'trialing', 'active', 'past_due', 'cancelled', 'paused', 'expired'));

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

    -- Auto-expire: if the trial has ended, update the row so the DB is consistent
    UPDATE subscriptions s_upd
    SET status = 'expired',
        updated_at = NOW()
    WHERE s_upd.user_id = p_user_id
      AND s_upd.status = 'trialing'
      AND s_upd.trial_end IS NOT NULL
      AND s_upd.trial_end <= NOW();

    RETURN QUERY
    SELECT
        s.status,
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
