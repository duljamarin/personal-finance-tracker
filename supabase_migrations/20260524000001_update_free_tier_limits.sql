-- =============================================================
-- Migration: Update free-tier limits to match app config
-- Date: 2026-05-24
--
-- Brings all server-side trigger limits into parity with
-- src/config/app.js (APP_CONFIG):
--
--   FREE_TRANSACTION_LIMIT : 30  → 100  (check_transaction_limit)
--   FREE_BUDGET_LIMIT       :  3  →  30  (check_budget_limit)
--   FREE_GOAL_LIMIT         :  3  →  40  (check_goal_limit)
--   FREE_RECURRING_LIMIT    :  5  →  30  (check_recurring_limit)
--
-- All functions are rewritten with:
--   SET search_path = ''          — fixes mutable search_path warning
--   Fully-qualified table names  — public.* prefix throughout
-- =============================================================


-- =============================================================
-- 1. Transactions: 30 → 100 / month
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_transaction_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  monthly_count   INTEGER;
  free_limit CONSTANT INTEGER := 100;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
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
-- 2. Budgets: 3 → 30 (per month per user)
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_budget_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  budget_count    INTEGER;
  free_limit CONSTANT INTEGER := 30;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
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
-- 3. Goals: 3 → 40 active non-completed goals
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_goal_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  active_count    INTEGER;
  free_limit CONSTANT INTEGER := 40;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
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
-- 4. Recurring transactions: 5 → 30 active
-- =============================================================
CREATE OR REPLACE FUNCTION public.check_recurring_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  user_is_premium BOOLEAN;
  active_count    INTEGER;
  free_limit CONSTANT INTEGER := 30;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = NEW.user_id
      AND (
        s.status IN ('active', 'trialing')
        OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
      )
  ) INTO user_is_premium;

  IF user_is_premium THEN
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
