-- ============================================
-- Fix User Signup Trigger
-- Created: 2026-02-08
-- This fixes the "Database error saving new user" issue
-- ============================================

-- Drop and recreate the trigger function with better error handling
DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
DROP FUNCTION IF EXISTS create_subscription_for_new_user();

-- Recreate function with exception handling and RLS bypass
CREATE OR REPLACE FUNCTION create_subscription_for_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Try to insert subscription record
    -- If table doesn't exist or any other error, don't block user creation
    BEGIN
        -- Bypass RLS by using a direct insert as the function owner
        INSERT INTO public.subscriptions (user_id, status)
        VALUES (NEW.id, 'none')
        ON CONFLICT (user_id) DO NOTHING;
        
        RAISE LOG 'Created subscription for user %', NEW.id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Log the error but don't prevent user creation
            RAISE WARNING 'Failed to create subscription for user %: %', NEW.id, SQLERRM;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created_subscription
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION create_subscription_for_new_user();

-- Make sure subscriptions table exists
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

-- Ensure RLS is enabled but with proper policies
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can read own subscription" ON subscriptions;
DROP POLICY IF EXISTS "Service role can manage subscriptions" ON subscriptions;
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON subscriptions;

-- Users can read their own subscription
CREATE POLICY "Users can read own subscription"
    ON subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Allow inserts during user creation (for triggers)
CREATE POLICY "Enable insert for authenticated users during signup"
    ON subscriptions FOR INSERT
    WITH CHECK (true);

-- Service role (for webhooks) can do everything
CREATE POLICY "Service role can manage subscriptions"
    ON subscriptions 
    USING (auth.role() = 'service_role')
    WITH CHECK (auth.role() = 'service_role');

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated, anon, service_role, postgres;
GRANT SELECT ON subscriptions TO authenticated;
GRANT ALL ON subscriptions TO service_role, postgres;

-- Backfill subscriptions for existing users who don't have one
INSERT INTO subscriptions (user_id, status)
SELECT id, 'none'
FROM auth.users
WHERE id NOT IN (SELECT user_id FROM subscriptions)
ON CONFLICT (user_id) DO NOTHING;
