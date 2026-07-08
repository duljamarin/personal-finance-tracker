-- Migration: relax the goal_milestone_percentage CHECK on notification_settings
-- =====================================================================
-- The original constraint (20260224000002) was BETWEEN 10 AND 50, which
-- rejected other step values (e.g. 5% or 100%) with a 23514 check-constraint
-- violation. Users want to choose any positive milestone interval, so widen the
-- allowed range to 1..100 (must be > 0 so the client-side milestone loop in
-- src/utils/finance/goalProgress.js — `for (pct = step; ...; pct += step)` —
-- can never stall; <=100 because progress is a percentage). UI input min/max
-- and clampRanges are updated to match (NotificationSettings.jsx).
--
-- Idempotent: drop the existing check (whatever its exact name) and add the new
-- one only if absent.
-- =====================================================================

BEGIN;

-- Drop any CHECK constraint on notification_settings.goal_milestone_percentage,
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
        WHERE att.attname = 'goal_milestone_percentage'
      )
  LOOP
    EXECUTE format(
      'ALTER TABLE public.notification_settings DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- Add the widened constraint: strictly positive, at most 100%.
ALTER TABLE public.notification_settings
  ADD CONSTRAINT notification_settings_goal_milestone_percentage_check
  CHECK (goal_milestone_percentage BETWEEN 1 AND 100);

COMMIT;
