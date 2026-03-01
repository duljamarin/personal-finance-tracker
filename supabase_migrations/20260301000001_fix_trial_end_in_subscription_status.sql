-- Migration: Return trial_end from get_subscription_status
-- Bug: trialEndsAt was using current_period_end, which can differ from trial_end.
--      When status = 'trialing', trial_end is the authoritative expiry timestamp.
-- Fix: Add trial_end to the returned columns so the frontend can use it directly.
-- Note: Must DROP first because the return type (OUT columns) is changing.

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
    paddle_subscription_id TEXT
) AS $$
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
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
