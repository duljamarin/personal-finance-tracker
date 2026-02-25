-- Migration: Fix trial_days_left off-by-one
-- Bug: CEIL(seconds / 86400) rounds 4.2 days UP to 5, making the UI show one extra day.
-- Fix: Use calendar-date subtraction (trial_end_date - today), which matches how users
--      naturally count "how many days until X" and matches what Paddle's email shows.

CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
    subscription_status TEXT,
    subscription_plan TEXT,
    is_premium BOOLEAN,
    is_trialing BOOLEAN,
    trial_days_left INTEGER,
    period_end TIMESTAMPTZ,
    subscription_cancel_at TIMESTAMPTZ,
    paddle_subscription_id TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.status,
        s.plan,
        (s.status IN ('active', 'trialing')) AS is_premium,
        (s.status = 'trialing') AS is_trialing,
        CASE WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW()
            -- Calendar-day difference: Mar 1 - Feb 25 = 4, not 5
            THEN GREATEST(0, (DATE(s.trial_end AT TIME ZONE 'UTC') - CURRENT_DATE)::INTEGER)
            ELSE 0
        END AS trial_days_left,
        s.current_period_end,
        s.cancel_at,
        s.paddle_subscription_id
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;
