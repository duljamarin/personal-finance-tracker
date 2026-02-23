-- ============================================
-- Fix subscription security and transaction limits
-- Created: 2026-02-23
--
-- Fixes:
-- 1. Server-side transaction limit enforcement for free tier users
-- 2. RPC functions now validate caller identity (prevent IDOR)
-- 3. is_premium logic considers current_period_end for grace period
-- ============================================

-- ===========================================
-- Fix #1: Server-side transaction limit (10/month for free users)
-- ===========================================

-- Function that checks if a user can insert a transaction
CREATE OR REPLACE FUNCTION check_transaction_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_is_premium BOOLEAN;
    monthly_count INTEGER;
    free_limit CONSTANT INTEGER := 10;
BEGIN
    -- Check if user has an active/trialing subscription OR is within their paid period
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
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

    -- Count transactions this month for free users
    SELECT COUNT(*) INTO monthly_count
    FROM transactions
    WHERE user_id = NEW.user_id
        AND date >= date_trunc('month', CURRENT_DATE)::DATE
        AND date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;

    IF monthly_count >= free_limit THEN
        RAISE EXCEPTION 'Monthly transaction limit reached. Upgrade to premium for unlimited transactions.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to transactions table
DROP TRIGGER IF EXISTS enforce_transaction_limit ON transactions;
CREATE TRIGGER enforce_transaction_limit
    BEFORE INSERT ON transactions
    FOR EACH ROW EXECUTE FUNCTION check_transaction_limit();


-- ===========================================
-- Fix #10: RPC functions validate caller identity
-- ===========================================

-- Recreate get_subscription_status with auth check
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
    -- Prevent users from querying other users' subscription status
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
            USING ERRCODE = 'P0003';
    END IF;

    RETURN QUERY
    SELECT
        s.status,
        s.plan,
        -- Fix #7: Consider current_period_end for grace period
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

-- Recreate get_monthly_transaction_count with auth check
CREATE OR REPLACE FUNCTION get_monthly_transaction_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    tx_count INTEGER;
BEGIN
    -- Prevent users from querying other users' transaction counts
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s data'
            USING ERRCODE = 'P0003';
    END IF;

    SELECT COUNT(*) INTO tx_count
    FROM transactions
    WHERE user_id = p_user_id
        AND date >= date_trunc('month', CURRENT_DATE)::DATE
        AND date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
    RETURN tx_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
