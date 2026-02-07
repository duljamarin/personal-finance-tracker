-- ============================================
-- Paddle Subscriptions Migration
-- Created: 2026-02-07
-- ============================================

-- 1. Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    paddle_subscription_id TEXT UNIQUE,
    paddle_customer_id TEXT,
    paddle_transaction_id TEXT,
    status TEXT NOT NULL DEFAULT 'none'
        CHECK (status IN ('none', 'trialing', 'active', 'past_due', 'cancelled', 'paused')),
    plan TEXT CHECK (plan IN ('monthly', 'yearly')),
    price_id TEXT,
    current_period_start TIMESTAMPTZ,
    current_period_end TIMESTAMPTZ,
    trial_start TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    cancel_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_user_subscription UNIQUE(user_id)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_sub_id ON subscriptions(paddle_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- 3. Enable Row Level Security
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy — users can only read their own subscription
-- All writes go through service_role (webhook edge function)
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
CREATE POLICY "Users can read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- 5. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT ON subscriptions TO authenticated;

-- 6. updated_at trigger
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER set_subscriptions_updated_at
    BEFORE UPDATE ON subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_subscriptions_updated_at();

-- 7. Function: get_subscription_status (called from frontend via RPC)
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
        CASE WHEN s.trial_end IS NOT NULL
            THEN GREATEST(0, EXTRACT(DAY FROM s.trial_end - NOW())::INTEGER)
            ELSE 0
        END AS trial_days_left,
        s.current_period_end,
        s.cancel_at,
        s.paddle_subscription_id
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Function: get_monthly_transaction_count
CREATE OR REPLACE FUNCTION get_monthly_transaction_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
    tx_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO tx_count
    FROM transactions
    WHERE user_id = p_user_id
        AND date >= date_trunc('month', CURRENT_DATE)::DATE
        AND date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;
    RETURN tx_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. Seed subscriptions for existing users (one-time migration)
-- Existing users get a default 'none' status
INSERT INTO subscriptions (user_id, status)
SELECT id, 'none'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 10. Trigger: auto-create subscription row for new user signups
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO subscriptions (user_id, status)
    VALUES (NEW.id, 'none')
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_subscription_for_new_user();
