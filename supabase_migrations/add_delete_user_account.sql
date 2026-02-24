-- Migration: add_delete_user_account
-- Creates a secure RPC function that deletes all of a user's
-- application data. The auth record is removed client-side via signOut.

CREATE OR REPLACE FUNCTION public.delete_user_account()
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

  -- Delete goal contributions
  DELETE FROM public.goal_contributions WHERE user_id = _user_id;

  -- Delete goals
  DELETE FROM public.goals WHERE user_id = _user_id;

  -- Delete recurring transactions and transactions
  DELETE FROM public.recurring_transactions WHERE user_id = _user_id;
  DELETE FROM public.transactions WHERE user_id = _user_id;

  -- Delete categories
  DELETE FROM public.categories WHERE user_id = _user_id;

  -- Delete budgets (table is "budgets", not "monthly_budgets")
  DELETE FROM public.budgets WHERE user_id = _user_id;

  -- Delete health scores
  DELETE FROM public.financial_health_scores WHERE user_id = _user_id;

  -- Delete subscription record (table is "subscriptions", not "user_subscriptions")
  DELETE FROM public.subscriptions WHERE user_id = _user_id;
END;
$$;

-- Grant execute privilege to authenticated users only
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

