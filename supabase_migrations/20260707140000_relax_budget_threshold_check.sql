-- Migration: relax the budget_threshold CHECK on notification_settings
-- =====================================================================
-- The original constraint (20260224000002) was BETWEEN 50 AND 100, which
-- rejected lower thresholds like 30% with a 23514 check-constraint violation.
-- Users want budget-overrun alerts to fire earlier, so widen the allowed range
-- to 0..100 (no lower bound beyond non-negative; >100% makes no sense). UI
-- input min is removed to match (NotificationSettings.jsx).
--
-- Idempotent: drop the existing check (whatever its exact name) and add the new
-- one only if absent.
-- =====================================================================

BEGIN;

-- Drop any CHECK constraint on notification_settings.budget_threshold,
-- regardless of its auto-generated name.
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'public'
      AND con.conrelid = 'public.notification_settings'::regclass
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = k.attnum
        WHERE att.attname = 'budget_threshold'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.notification_settings DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- Add the widened constraint: non-negative, at most 100%.
ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_budget_threshold_check
  CHECK (budget_threshold BETWEEN 0 AND 100);

COMMIT;
