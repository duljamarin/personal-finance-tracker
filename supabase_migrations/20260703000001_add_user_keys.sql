-- Migration: E2E encryption key storage
-- Description: Stores per-user wrapped data-encryption-keys (DEK) for
-- client-side E2E encryption of selected text fields. The server never
-- stores or sees an unwrapped DEK or plaintext key material; both wrapped
-- copies are encrypted blobs produced entirely in the browser.
-- Additive only — no existing tables/columns are changed.

CREATE TABLE IF NOT EXISTS public.user_keys (
  user_id               uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  key_version           integer NOT NULL DEFAULT 1,
  -- DEK wrapped by a KEK derived from the account password (AES-256-GCM)
  dek_password_wrapped  text NOT NULL,
  kdf_salt_password     text NOT NULL,
  -- DEK wrapped by a KEK derived from the one-time recovery code
  dek_recovery_wrapped  text NOT NULL,
  kdf_salt_recovery     text NOT NULL,
  kdf_iterations        integer NOT NULL DEFAULT 600000,
  encryption_status     text NOT NULL DEFAULT 'migrating'
                        CHECK (encryption_status IN ('migrating', 'enabled', 'disabling')),
  -- per-table resume cursor for the lazy client-side migration, e.g.
  -- {"transactions": "<last uuid>", "goals": "done"}
  migration_cursor      jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- retired wrapped-key copies kept after a "lost recovery code, continue
  -- with a new key" reset — ciphertext under them remains recoverable if
  -- the old recovery code ever turns up
  previous_keys         jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- Supabase Data API access is no longer granted by default on new tables
-- (see https://supabase.com/ — Data API access changes, effective for new
-- projects from 2026-05-30 and enforced on all projects from 2026-10-30).
-- RLS below is still the real access boundary; these grants only make the
-- table reachable via supabase-js/PostgREST at all. No 'anon' grant — this
-- table is only ever touched by authenticated users.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_keys TO service_role;

ALTER TABLE public.user_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own keys"
  ON public.user_keys FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own keys"
  ON public.user_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own keys"
  ON public.user_keys FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own keys"
  ON public.user_keys FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_user_keys_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_user_keys_updated_at
  BEFORE UPDATE ON public.user_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_user_keys_updated_at();
