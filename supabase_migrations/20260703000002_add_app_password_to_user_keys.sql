-- Migration: OAuth "app password" support for E2E encryption
-- Description: OAuth-only users (Google sign-in) have no password in
-- Supabase Auth, so the normal "unwrap DEK with account password at login"
-- flow (AuthContext.login) never runs for them. They instead set a
-- standalone "app password" used only as PBKDF2 input for the encryption
-- key-encryption-key — never sent to or checked by Supabase Auth. This flag
-- is purely informational for the UI (label the field correctly, and skip
-- the "current account password" flow in AccountPage's password-change form
-- since it doesn't apply to app passwords).

ALTER TABLE public.user_keys
  ADD COLUMN IF NOT EXISTS is_app_password boolean NOT NULL DEFAULT false;
