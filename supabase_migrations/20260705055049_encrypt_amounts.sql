-- Migration: E2E-encrypt all monetary amounts
-- =====================================================================
-- Amounts become client-side AES-GCM ciphertext (enc:v1:...) stored as text.
-- Every server-side computation on those amounts moves client-side
-- (see src/utils/finance/*). This migration must be deployed TOGETHER with
-- the matching frontend (Phase 0 Step A + C):
--   1. Retype ~19 NUMERIC amount columns to text.
--   2. Drop CHECK constraints that assume numeric values (validation lives
--      client-side).
--   3. Drop amount-maintaining triggers (goal current_amount, milestone
--      completion) — reimplemented in finance/goalProgress.js.
--   4. Drop amount-reading RPCs (health score, benchmarks, notification
--      builders, net-worth snapshot) — reimplemented in finance/*.
--   5. Force the client-side E2EE migration runner to re-scan every table so
--      historical plaintext amounts get encrypted (cursor reset).
--
-- exchange_rate / currency_code stay plaintext by design (public FX data;
-- reveal nothing once amounts are hidden). RLS remains the primary boundary;
-- all target tables already have auth.uid() = user_id policies with WITH CHECK,
-- so the client can perform the writes the old SECURITY DEFINER RPCs did.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Drop dependent triggers first (they reference the columns / functions)
-- ---------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_update_goal_amount ON public.goal_contributions;
DROP TRIGGER IF EXISTS trigger_check_milestones   ON public.goals;

-- ---------------------------------------------------------------------
-- 2. Drop amount-reading / amount-maintaining functions
-- ---------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.update_goal_current_amount()          CASCADE;
DROP FUNCTION IF EXISTS public.check_milestone_completion()          CASCADE;
DROP FUNCTION IF EXISTS public.get_category_benchmarks(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.check_budget_notifications(uuid)       CASCADE;
DROP FUNCTION IF EXISTS public.check_recurring_notifications(uuid)    CASCADE;
DROP FUNCTION IF EXISTS public.check_goal_milestone_notifications(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.upsert_net_worth_snapshot(uuid)        CASCADE;
DROP FUNCTION IF EXISTS public.get_financial_health_score(uuid, date, boolean) CASCADE;
DROP FUNCTION IF EXISTS public.store_financial_health_score(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.get_health_score_history(uuid, integer) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_financial_health_score(uuid, date) CASCADE;

-- ---------------------------------------------------------------------
-- 3. Drop every CHECK constraint that references an amount column
--    (constraints were created anonymously → auto-named; drop by discovery)
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  amount_cols CONSTANT text[] := ARRAY[
    'amount', 'base_amount', 'percentage', 'target_amount', 'current_amount',
    'current_value', 'total_assets', 'total_liabilities', 'net_worth',
    'total_income', 'total_expenses', 'savings_amount'
  ];
BEGIN
  FOR r IN
    SELECT con.conrelid::regclass AS tbl, con.conname
    FROM pg_constraint con
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'public'
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = k.attnum
        WHERE att.attname = ANY(amount_cols)
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 4. Retype amount columns NUMERIC -> text (existing values cast to text)
-- ---------------------------------------------------------------------
ALTER TABLE public.transactions        ALTER COLUMN amount           TYPE text USING amount::text;
ALTER TABLE public.transactions        ALTER COLUMN base_amount      TYPE text USING base_amount::text;

ALTER TABLE public.transaction_splits  ALTER COLUMN amount           TYPE text USING amount::text;
ALTER TABLE public.transaction_splits  ALTER COLUMN percentage       TYPE text USING percentage::text;

ALTER TABLE public.recurring_transactions ALTER COLUMN amount        TYPE text USING amount::text;

ALTER TABLE public.budgets             ALTER COLUMN amount           TYPE text USING amount::text;

ALTER TABLE public.goals               ALTER COLUMN target_amount    TYPE text USING target_amount::text;
ALTER TABLE public.goals               ALTER COLUMN current_amount   TYPE text USING current_amount::text;

ALTER TABLE public.goal_milestones     ALTER COLUMN target_amount    TYPE text USING target_amount::text;

ALTER TABLE public.goal_contributions  ALTER COLUMN amount           TYPE text USING amount::text;

ALTER TABLE public.assets              ALTER COLUMN current_value    TYPE text USING current_value::text;

ALTER TABLE public.net_worth_snapshots ALTER COLUMN total_assets     TYPE text USING total_assets::text;
ALTER TABLE public.net_worth_snapshots ALTER COLUMN total_liabilities TYPE text USING total_liabilities::text;
ALTER TABLE public.net_worth_snapshots ALTER COLUMN net_worth        TYPE text USING net_worth::text;

ALTER TABLE public.financial_health_scores ALTER COLUMN total_income    TYPE text USING total_income::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN total_expenses  TYPE text USING total_expenses::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN savings_amount  TYPE text USING savings_amount::text;

-- Drop numeric DEFAULTs that no longer make sense on text columns.
ALTER TABLE public.goals               ALTER COLUMN current_amount DROP DEFAULT;
ALTER TABLE public.assets              ALTER COLUMN current_value  DROP DEFAULT;
ALTER TABLE public.net_worth_snapshots ALTER COLUMN total_assets      DROP DEFAULT;
ALTER TABLE public.net_worth_snapshots ALTER COLUMN total_liabilities DROP DEFAULT;
ALTER TABLE public.net_worth_snapshots ALTER COLUMN net_worth         DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN total_income   DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN total_expenses DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN savings_amount DROP DEFAULT;

-- ---------------------------------------------------------------------
-- 5. Ensure Data-API GRANTs exist for tables the client now writes directly
--    (idempotent; RLS still enforces per-user access).
-- ---------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications           TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_health_scores TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.net_worth_snapshots     TO authenticated;

-- ---------------------------------------------------------------------
-- 6. Force the client-side E2EE migration runner to re-encrypt historical
--    plaintext amounts on next unlock (idempotent: isEncrypted() skips
--    already-encrypted values; text fields already encrypted are untouched).
--    Only affects users who have encryption enabled (a user_keys row).
-- ---------------------------------------------------------------------
UPDATE public.user_keys SET migration_cursor = '{}'::jsonb;

COMMIT;
