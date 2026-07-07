-- Migration: E2E-encrypt the remaining financial_health_scores columns
-- =====================================================================
-- Extends E2EE to the derived score columns and the `insights` payload so
-- that not even a DB operator can read them. These values are already
-- computed and read back entirely client-side (src/utils/finance/healthScore.js):
--   - getHealthScore()        computes + upserts a snapshot (client-side)
--   - getHealthScoreHistory() reads snapshots filtered ONLY by user_id and
--                             ordered by month_date — nothing queries, filters,
--                             sorts, or aggregates on a score/insights value.
-- That is the condition that makes them safe to encrypt: the server never
-- needs their plaintext.
--
-- Amount columns (total_income/total_expenses/savings_amount) were already
-- retyped to text and encrypted in 20260705055049_encrypt_amounts.sql; this
-- migration handles the score columns, the two category counts, and insights.
--
-- Must be deployed TOGETHER with the matching frontend (fieldMap.js now lists
-- these fields under AMOUNT_FIELDS/NUMERIC_FIELDS + JSON_FIELDS). An
-- encryption-enabled client writes enc:v1:... ciphertext into these columns,
-- which fails while they are still NUMERIC/INTEGER/JSONB.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1. Retype score + count columns NUMERIC/INTEGER -> text
--    (existing values cast to text; client coerces back to Number on read).
-- ---------------------------------------------------------------------
ALTER TABLE public.financial_health_scores ALTER COLUMN total_score                 TYPE text USING total_score::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN budget_adherence_score      TYPE text USING budget_adherence_score::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN income_expense_ratio_score  TYPE text USING income_expense_ratio_score::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN spending_volatility_score   TYPE text USING spending_volatility_score::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN savings_consistency_score   TYPE text USING savings_consistency_score::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN categories_over_budget      TYPE text USING categories_over_budget::text;
ALTER TABLE public.financial_health_scores ALTER COLUMN categories_within_budget    TYPE text USING categories_within_budget::text;

-- ---------------------------------------------------------------------
-- 2. Retype insights JSONB -> text. Existing jsonb serializes to its JSON
--    text form (insights::text yields e.g. '[{"type":"savings",...}]'), which
--    is exactly what the client parses back via JSON.parse on read. New rows
--    from an encryption-enabled client store enc:v1:... ciphertext of that
--    same JSON string.
-- ---------------------------------------------------------------------
ALTER TABLE public.financial_health_scores ALTER COLUMN insights TYPE text USING insights::text;

-- ---------------------------------------------------------------------
-- 3. Drop numeric/jsonb DEFAULTs that no longer make sense on text columns.
-- ---------------------------------------------------------------------
ALTER TABLE public.financial_health_scores ALTER COLUMN total_score                DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN budget_adherence_score     DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN income_expense_ratio_score DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN spending_volatility_score  DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN savings_consistency_score  DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN categories_over_budget     DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN categories_within_budget   DROP DEFAULT;
ALTER TABLE public.financial_health_scores ALTER COLUMN insights                   DROP DEFAULT;

-- ---------------------------------------------------------------------
-- 4. Drop any CHECK constraints referencing the retyped columns (score range
--    validation now lives client-side). Discover-and-drop since the original
--    table created them anonymously.
-- ---------------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  target_cols CONSTANT text[] := ARRAY[
    'total_score', 'budget_adherence_score', 'income_expense_ratio_score',
    'spending_volatility_score', 'savings_consistency_score',
    'categories_over_budget', 'categories_within_budget'
  ];
BEGIN
  FOR r IN
    SELECT con.conrelid::regclass AS tbl, con.conname
    FROM pg_constraint con
    JOIN pg_namespace nsp ON nsp.oid = con.connamespace
    WHERE con.contype = 'c'
      AND nsp.nspname = 'public'
      AND con.conrelid = 'public.financial_health_scores'::regclass
      AND EXISTS (
        SELECT 1
        FROM unnest(con.conkey) AS k(attnum)
        JOIN pg_attribute att
          ON att.attrelid = con.conrelid AND att.attnum = k.attnum
        WHERE att.attname = ANY(target_cols)
      )
  LOOP
    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------
-- 5. Force the client-side E2EE migration runner to re-scan every table so
--    historical plaintext score/insights values get encrypted on next unlock.
--    Idempotent: isEncrypted() skips already-encrypted values. Only affects
--    users who have encryption enabled (a user_keys row).
-- ---------------------------------------------------------------------
UPDATE public.user_keys SET migration_cursor = '{}'::jsonb;

COMMIT;
