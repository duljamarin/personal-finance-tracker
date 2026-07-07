-- Migration: E2E-encrypt categories.name (deterministic) and categories.emoji
-- =====================================================================
-- categories.name and categories.emoji become client-side ciphertext so a DB
-- operator can no longer read category labels/icons.
--
-- name uses DETERMINISTIC encryption (fixed IV derived from HMAC(macKey,
-- plaintext)) so that:
--   - UNIQUE(user_id, name) still rejects duplicates (equal plaintext -> equal
--     ciphertext), and
--   - the add/update duplicate-name equality lookup (api/categories.js) can
--     match by comparing deterministic ciphertext.
-- emoji uses the normal random-IV scheme (no constraint on it).
--
-- No column retype is needed: name and emoji are already `text`. The UNIQUE
-- constraint categories_user_id_name_key keeps working over ciphertext.
--
-- What made this possible: the server SQL functions that used to read
-- categories.name (benchmarks, health score, budget/recurring/goal
-- notifications) were all dropped in 20260705055049_encrypt_amounts and
-- reimplemented client-side, so the server no longer needs plaintext names.
--
-- Must be deployed TOGETHER with the matching frontend (fieldMap.js registers
-- categories.name under DETERMINISTIC_FIELDS and categories.emoji under text
-- fields; api/categories.js encrypts writes, decrypts + client-sorts reads).
--
-- Note on defaults: seed_default_categories_for_user() still inserts the 24
-- default categories as PLAINTEXT on signup. Those labels are public (identical
-- for every user) so they leak nothing, and the lazy client-side migration
-- encrypts them on next unlock. The emoji column default ('📂') is likewise
-- harmless plaintext until a row is written by the client. No change needed.
-- =====================================================================

BEGIN;

-- Force the client-side E2EE migration runner to re-scan every table so
-- historical plaintext category names/emojis get encrypted on next unlock.
-- Idempotent: isEncrypted() skips already-encrypted values. Only affects users
-- who have encryption enabled (a user_keys row).
UPDATE public.user_keys SET migration_cursor = '{}'::jsonb;

COMMIT;
