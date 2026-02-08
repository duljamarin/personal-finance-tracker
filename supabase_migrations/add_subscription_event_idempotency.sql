-- ============================================
-- Add idempotency support to subscriptions table
-- Tracks last processed Paddle event_id to prevent duplicate processing
-- Also fixes trial_days_left calculation to use total seconds instead of day component
-- ============================================

-- 1. Add last_event_id column for webhook idempotency
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_event_id TEXT;

-- 2. Fix get_subscription_status: use EPOCH-based calculation for accurate trial days
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
            THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (s.trial_end - NOW())) / 86400)::INTEGER)
            ELSE 0
        END AS trial_days_left,
        s.current_period_end,
        s.cancel_at,
        s.paddle_subscription_id
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
