-- Single-currency model: every user picks one currency and keeps it.
--
-- Until now the chosen currency lived only in auth.users.raw_user_meta_data
-- (written by the onboarding wizard). That is unreachable from SQL triggers and
-- Edge Functions, has no constraint, and did not exist at all for users who
-- signed up before the onboarding currency step. This migration gives it a real
-- home in the schema and backfills it for everyone.
--
-- Backfill rule (agreed with the product owner):
--   1. auth metadata preferred_currency, when the user has one, wins.
--   2. Otherwise the user's most-used transactions.currency_code, ties broken by
--      the most recent transaction.
--   3. Otherwise EUR.
--
-- No monetary value is rewritten anywhere. amount / base_amount are encrypted
-- (see 20260705055049_encrypt_amounts.sql) and cannot be converted in SQL; the
-- chosen currency is a label + input unit only, so stored numbers stay as they
-- are and nothing can be corrupted by this migration.

CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  preferred_currency text NOT NULL DEFAULT 'EUR'
    CHECK (preferred_currency IN ('EUR','USD','GBP','ALL','CHF','JPY','CAD','AUD')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
CREATE POLICY "Users can manage their own settings"
  ON public.user_settings
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Supabase no longer grants Data API access to new public tables by default.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_settings TO service_role;

CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON public.user_settings(user_id);

-- updated_at trigger, mirroring the notification_settings pattern.
CREATE OR REPLACE FUNCTION public.update_user_settings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_settings_updated_at();

-- ---------------------------------------------------------------------------
-- Backfill
-- ---------------------------------------------------------------------------
-- Runs once. ON CONFLICT DO NOTHING keeps it idempotent: re-running never
-- overwrites a currency the user has since chosen.

WITH currency_counts AS (
  SELECT
    t.user_id,
    t.currency_code,
    count(*)    AS uses,
    max(t.date) AS last_used
  FROM public.transactions t
  WHERE t.currency_code IS NOT NULL
  GROUP BY t.user_id, t.currency_code
),
most_used AS (
  SELECT DISTINCT ON (user_id)
    user_id,
    currency_code
  FROM currency_counts
  -- most transactions wins; most recent breaks a tie
  ORDER BY user_id, uses DESC, last_used DESC
)
INSERT INTO public.user_settings (user_id, preferred_currency)
SELECT
  u.id,
  COALESCE(
    NULLIF(u.raw_user_meta_data->>'preferred_currency', ''),
    m.currency_code,
    'EUR'
  )
FROM auth.users u
LEFT JOIN most_used m ON m.user_id = u.id
ON CONFLICT (user_id) DO NOTHING;

-- Any currency code outside the supported set (bad legacy data) falls back to
-- EUR rather than failing the CHECK above.
UPDATE public.user_settings
SET preferred_currency = 'EUR'
WHERE preferred_currency NOT IN ('EUR','USD','GBP','ALL','CHF','JPY','CAD','AUD');

-- New signups get a row automatically; onboarding then updates it in place.
CREATE OR REPLACE FUNCTION public.create_user_settings_on_signup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, preferred_currency)
  VALUES (
    NEW.id,
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'preferred_currency', ''), 'EUR')
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_user_settings ON auth.users;
CREATE TRIGGER trg_create_user_settings
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_settings_on_signup();

COMMENT ON TABLE public.user_settings IS
  'Per-user app settings. preferred_currency is the single currency the whole app displays and accepts input in.';
COMMENT ON COLUMN public.user_settings.preferred_currency IS
  'ISO 4217 code. Single source of truth; transactions.currency_code is legacy and no longer written for new rows.';
