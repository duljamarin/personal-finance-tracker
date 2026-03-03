-- supabase_migrations/20260303000004_fix_remaining_security_warnings.sql
-- Fixes the 4 remaining Security Advisor warnings:
--
-- 1. Function Search Path Mutable: public.add_default_categories
--    This is a legacy function superseded by create_default_categories_for_new_user
--    and seed_default_categories_for_user. Drop it.
--
--
-- 3. RLS Policy Always True: public.subscriptions (INSERT WITH CHECK (true))
--    The create_subscription_for_new_user trigger function is SECURITY DEFINER,
--    meaning it runs as the function owner and bypasses RLS entirely.
--    The WITH CHECK (true) INSERT policy is therefore redundant and unsafe.
--    Drop it and replace with a properly scoped policy.
--

-- ============================================================
-- Fix 1: Drop legacy add_default_categories function
--    The old trigger on_auth_user_created (no suffix) still points to this
--    function. Drop the trigger first, then the function.
--    The replacement trigger on_auth_user_created_categories (created in
--    20260226000001) calls create_default_categories_for_new_user instead
--    and remains intact.
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.add_default_categories();
DROP FUNCTION IF EXISTS public.add_default_categories(uuid);

-- ============================================================
-- Fix 2: Replace the always-true INSERT policy on subscriptions
--
-- The subscription row is created by the create_subscription_for_new_user
-- trigger (SECURITY DEFINER), which bypasses RLS, so no INSERT policy
-- is needed for that path. Direct authenticated inserts should only be
-- allowed when the user_id matches the caller.
-- ============================================================
DROP POLICY IF EXISTS "Enable insert for authenticated users during signup" ON public.subscriptions;

CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

