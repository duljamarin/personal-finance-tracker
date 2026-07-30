-- =============================================================
-- Migration: align free-tier limit triggers with get_subscription_status
-- Date: 2026-07-30
--
-- Problem: the four limit triggers decide "is this user premium?" with
--
--     s.status IN ('active', 'trialing')
--     OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
--
-- The first branch is NOT date-bounded, so the literal status string alone
-- grants unlimited access. That contradicts get_subscription_status, which
-- (since 20260729000001 / 20260729000002) date-bounds every branch. Two real
-- cases diverge, in both of which the UI correctly shows the user as free while
-- the database still lets them insert without limit:
--
--   1. Trial lapsed, never purchased. The row stays status='trialing' with
--      trial_end in the past until something rewrites it. The RPC reports
--      is_premium=false, but 'trialing' satisfies the trigger -> unlimited.
--
--   2. Subscription cancelled/expired and current_period_end has passed, but a
--      dropped `subscription.expired` webhook left status='active'. The RPC
--      reports is_premium=false; the trigger still sees 'active' -> unlimited.
--
-- Only the client-side canCreate*/canAddTransaction checks stood between a
-- lapsed user and unlimited inserts, and those are trivially bypassable via the
-- Data API. This fails OPEN, which is the same class of bug that
-- 20260729000002 fixed for the read path.
--
-- Fix: a single shared helper, public.user_has_premium_access(uuid), whose
-- expression mirrors the RPC's is_premium exactly. All four triggers call it, so
-- the read path and the write path can no longer drift apart.
--
-- The `trial_end IS NULL` / `current_period_end IS NULL` guards are load-bearing
-- and carried over deliberately: card-free trials never get a period end, and
-- subscription.created can land before a billing period is known. Without them
-- a fresh paying subscriber would be limited immediately.
--
-- This migration ALSO lowers the free-tier caps to mirror the new values in
-- src/config/app.js APP_CONFIG:
--
--   FREE_TRANSACTION_LIMIT : 100 -> 30   (per calendar month)
--   FREE_RECURRING_LIMIT   :  30 -> 20   (active)
--   FREE_BUDGET_LIMIT      :  30 -> 10   (per month per user)
--   FREE_GOAL_LIMIT        :  40 -> 10   (active, non-completed)
--
-- Lowering a cap does NOT delete anything already created. Existing free users
-- over the new cap keep their rows and simply cannot INSERT more until they are
-- back under it (the triggers are BEFORE INSERT only). That is deliberate:
-- destroying user data to enforce a pricing change would be far worse.
-- =============================================================


-- =============================================================
-- 0. Shared premium predicate — mirrors get_subscription_status.is_premium
-- =============================================================
CREATE OR REPLACE FUNCTION public.user_has_premium_access(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = p_user_id
      AND (
        -- Paid and still inside the paid period. NULL period end = period not
        -- known yet (fresh checkout), which is allowed.
        (
          s.status = 'active'
          AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
        )
        -- On trial and the trial has not lapsed.
        OR (
          s.status = 'trialing'
          AND (s.trial_end IS NULL OR s.trial_end > NOW())
        )
        -- Wound down but still inside the period already paid for.
        OR (
          s.status IN ('past_due', 'cancelled')
          AND s.current_period_end IS NOT NULL
          AND s.current_period_end > NOW()
        )
      )
  );
$$;

COMMENT ON FUNCTION public.user_has_premium_access(UUID) IS
  'Single source of truth for premium access on the WRITE path. Must stay in '
  'sync with the is_premium expression in get_subscription_status.';

-- SECURITY DEFINER + takes an explicit user id, so do NOT expose it to clients:
-- only the limit triggers (which run as definer) need it.
REVOKE ALL ON FUNCTION public.user_has_premium_access(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_premium_access(UUID) TO service_role;


-- =============================================================
-- 1. Transactions: 30 / month
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_transaction_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  monthly_count INTEGER;
  free_limit CONSTANT INTEGER := 30;
BEGIN
  IF public.user_has_premium_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO monthly_count
  FROM public.transactions
  WHERE user_id = NEW.user_id
    AND date >= date_trunc('month', CURRENT_DATE)::DATE
    AND date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;

  IF monthly_count >= free_limit THEN
    RAISE EXCEPTION 'Monthly transaction limit reached. Upgrade to premium for unlimited transactions.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_transaction_limit ON public.transactions;
CREATE TRIGGER enforce_transaction_limit
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_transaction_limit();


-- =============================================================
-- 2. Budgets: 10 per month per user
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  budget_count INTEGER;
  free_limit CONSTANT INTEGER := 10;
BEGIN
  IF public.user_has_premium_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO budget_count
  FROM public.budgets
  WHERE user_id = NEW.user_id
    AND year  = NEW.year
    AND month = NEW.month;

  IF budget_count >= free_limit THEN
    RAISE EXCEPTION 'Budget limit reached. Upgrade to premium for unlimited budgets.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_budget_limit ON public.budgets;
CREATE TRIGGER enforce_budget_limit
  BEFORE INSERT ON public.budgets
  FOR EACH ROW EXECUTE FUNCTION public.check_budget_limit();


-- =============================================================
-- 3. Goals: 10 active non-completed
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_count INTEGER;
  free_limit CONSTANT INTEGER := 10;
BEGIN
  IF public.user_has_premium_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.goals
  WHERE user_id      = NEW.user_id
    AND is_active    = true
    AND is_completed = false;

  IF active_count >= free_limit THEN
    RAISE EXCEPTION 'Goal limit reached. Upgrade to premium for unlimited goals.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_goal_limit ON public.goals;
CREATE TRIGGER enforce_goal_limit
  BEFORE INSERT ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.check_goal_limit();


-- =============================================================
-- 4. Recurring transactions: 20 active
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_recurring_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  active_count INTEGER;
  free_limit CONSTANT INTEGER := 20;
BEGIN
  IF public.user_has_premium_access(NEW.user_id) THEN
    RETURN NEW;
  END IF;

  SELECT COUNT(*) INTO active_count
  FROM public.recurring_transactions
  WHERE user_id  = NEW.user_id
    AND is_active = true;

  IF active_count >= free_limit THEN
    RAISE EXCEPTION 'Recurring transaction limit reached. Upgrade to premium for unlimited recurring transactions.'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_recurring_limit ON public.recurring_transactions;
CREATE TRIGGER enforce_recurring_limit
  BEFORE INSERT ON public.recurring_transactions
  FOR EACH ROW EXECUTE FUNCTION public.check_recurring_limit();


-- =============================================================
-- 5. Backfill: settle rows the old predicate left in a stale state
-- =============================================================
-- Lapsed trials that were never rewritten (the RPC already reports these as
-- 'expired' on read; persist it so the write path and any direct query agree).
UPDATE public.subscriptions
SET status = 'expired',
    updated_at = NOW()
WHERE status = 'trialing'
  AND trial_end IS NOT NULL
  AND trial_end <= NOW();

-- Subscriptions still marked 'active' whose paid period ended (dropped
-- subscription.expired webhook). Paddle renewals rewrite current_period_end, so
-- a past period end on an 'active' row means the renewal did not happen.
UPDATE public.subscriptions
SET status = 'expired',
    updated_at = NOW()
WHERE status = 'active'
  AND current_period_end IS NOT NULL
  AND current_period_end <= NOW();
