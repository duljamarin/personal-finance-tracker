-- Migration: wipe_financial_data_on_key_reset
-- Creates a secure RPC that deletes a user's ENCRYPTED financial data while
-- KEEPING the account, subscription, notification preferences and (freshly
-- rotated) user_keys row intact.
--
-- Used when a user resets their password but has lost their E2EE recovery code.
-- resetWithNewKey() rotates the DEK, which makes every previously encrypted row
-- undecryptable (category names/emojis, transaction titles/amounts, budgets,
-- goals, etc.). Rather than leave the app full of unreadable placeholders, the
-- client calls this to start clean, then re-seeds the default categories under
-- the new key. See src/utils/crypto/keyLifecycle.js (reseedAfterKeyReset).
--
-- Deliberately does NOT touch:
--   - subscriptions        (billing must survive a key reset)
--   - notification_settings (per-type/threshold prefs are not encrypted; keep)
--   - user_keys            (already rotated to the new DEK by resetWithNewKey)
--   - auth.users           (this is not account deletion)
--
-- Deletion order mirrors delete_user_account() so foreign keys stay satisfied.

CREATE OR REPLACE FUNCTION public.wipe_financial_data_on_key_reset()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _user_id uuid := auth.uid();
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- goal_milestones has no user_id column; delete via goal_id
  DELETE FROM public.goal_milestones
    WHERE goal_id IN (SELECT id FROM public.goals WHERE user_id = _user_id);

  DELETE FROM public.goal_contributions WHERE user_id = _user_id;
  DELETE FROM public.goals WHERE user_id = _user_id;

  -- transaction_splits before transactions (FK)
  DELETE FROM public.transaction_splits WHERE user_id = _user_id;
  DELETE FROM public.recurring_transactions WHERE user_id = _user_id;
  DELETE FROM public.transactions WHERE user_id = _user_id;

  -- budgets before categories (budgets.category_id -> categories.id)
  DELETE FROM public.budgets WHERE user_id = _user_id;
  DELETE FROM public.categories WHERE user_id = _user_id;

  DELETE FROM public.financial_health_scores WHERE user_id = _user_id;

  DELETE FROM public.net_worth_snapshots WHERE user_id = _user_id;
  DELETE FROM public.assets WHERE user_id = _user_id;

  -- Notifications embed encrypted amounts in their text, so they must go.
  -- notification_settings are NOT encrypted and are intentionally kept.
  DELETE FROM public.notifications WHERE user_id = _user_id;
END;
$$;

-- authenticated only; RLS is not consulted inside SECURITY DEFINER, but the
-- function scopes every delete to auth.uid() so a caller can only wipe their own.
GRANT EXECUTE ON FUNCTION public.wipe_financial_data_on_key_reset() TO authenticated;
