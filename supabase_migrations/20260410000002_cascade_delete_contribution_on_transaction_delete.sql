-- Migration: Cascade-delete goal contributions when their linked transaction is deleted
-- Problem: When a user manually deletes a transaction that was created by a goal
--          contribution, the contribution remains and the goal amount stays unchanged.
-- Fix: A trigger on transactions that deletes the linked contribution (if any),
--      which then fires the existing update_goal_current_amount trigger to adjust
--      the goal's current_amount.

CREATE OR REPLACE FUNCTION delete_contribution_on_transaction_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    DELETE FROM goal_contributions
    WHERE transaction_id = OLD.id;
    RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trigger_delete_contribution_on_transaction_delete ON transactions;
CREATE TRIGGER trigger_delete_contribution_on_transaction_delete
    BEFORE DELETE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION delete_contribution_on_transaction_delete();
