-- Migration: Fix stale 'trialing' subscription_status after trial expiry
--
-- Problem: 20260410000001 replaced the CASE-masked status with the raw
--   `s.status` column and relied on an in-function
--   `UPDATE subscriptions SET status = 'expired'` to keep the row fresh.
--   That UPDATE is a silent no-op: `subscriptions` has RLS enabled and its
--   only policies are SELECT + INSERT for `authenticated` and ALL for
--   `service_role`. SECURITY DEFINER does not bypass RLS by itself (that
--   needs BYPASSRLS or table ownership, which the function owner lacks on
--   hosted Supabase), so the UPDATE matches 0 rows, raises no error, and the
--   following SELECT returns the stale 'trialing' value.
--
--   Result: is_premium/is_trialing were correct (computed inline), but
--   subscription_status stayed 'trialing' forever after the trial ended.
--
-- Fix (three parts):
--   1. Re-introduce the CASE mask so the returned status is correct even if
--      the row itself is never updated. This is the load-bearing change.
--   2. Add an UPDATE policy so the auto-expire write can actually land,
--      keeping the raw table consistent for server-side consumers
--      (bulk-email segmentation, analytics) rather than only the RPC.
--   3. One-time backfill of rows already stuck in 'trialing'.

-- 1. Allow a user's own row to be auto-expired.
--    Deliberately narrow: only a lapsed trial may be transitioned, so this
--    cannot be used to self-grant premium.
DROP POLICY IF EXISTS "Users can expire own lapsed trial" ON subscriptions;
CREATE POLICY "Users can expire own lapsed trial"
    ON subscriptions
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() = user_id
        AND status = 'trialing'
        AND trial_end IS NOT NULL
        AND trial_end <= NOW()
    )
    WITH CHECK (
        auth.uid() = user_id
        AND status = 'expired'
    );

-- 2. Restore the status mask while keeping the auto-expire UPDATE.
CREATE OR REPLACE FUNCTION get_subscription_status(p_user_id UUID)
RETURNS TABLE (
    subscription_status TEXT,
    subscription_plan TEXT,
    is_premium BOOLEAN,
    is_trialing BOOLEAN,
    trial_days_left INTEGER,
    period_end TIMESTAMPTZ,
    trial_end TIMESTAMPTZ,
    subscription_cancel_at TIMESTAMPTZ,
    paddle_subscription_id TEXT,
    had_trial BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Prevent users from querying other users' subscription status
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
            USING ERRCODE = 'P0003';
    END IF;

    -- Best-effort: keep the stored row consistent. If this is blocked for any
    -- reason the CASE below still returns the correct value.
    UPDATE subscriptions s_upd
    SET status = 'expired',
        updated_at = NOW()
    WHERE s_upd.user_id = p_user_id
      AND s_upd.status = 'trialing'
      AND s_upd.trial_end IS NOT NULL
      AND s_upd.trial_end <= NOW();

    RETURN QUERY
    SELECT
        -- Never report a lapsed trial as 'trialing', regardless of the raw column.
        CASE
            WHEN s.status = 'trialing'
                 AND s.trial_end IS NOT NULL
                 AND s.trial_end <= NOW()
            THEN 'expired'::TEXT
            ELSE s.status
        END,
        s.plan,
        -- Premium if active, or trialing with valid trial, or cancelled/past_due with valid period
        (
            s.status = 'active'
            OR (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW()))
            OR (
                s.status IN ('past_due', 'cancelled')
                AND s.current_period_end IS NOT NULL
                AND s.current_period_end > NOW()
            )
        ) AS is_premium,
        -- Only trialing if trial is still valid
        (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW())) AS is_trialing,
        CASE WHEN s.trial_end IS NOT NULL AND s.trial_end > NOW()
            THEN GREATEST(0, (DATE(s.trial_end AT TIME ZONE 'UTC') - CURRENT_DATE)::INTEGER)
            ELSE 0
        END AS trial_days_left,
        s.current_period_end,
        s.trial_end,
        s.cancel_at,
        s.paddle_subscription_id,
        s.had_trial
    FROM subscriptions s
    WHERE s.user_id = p_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_subscription_status(UUID) TO authenticated;

-- 3. Backfill rows already stuck in 'trialing' past their trial_end.
--    Runs as the migration role, so RLS is not in play here.
UPDATE subscriptions
SET status = 'expired',
    updated_at = NOW()
WHERE status = 'trialing'
  AND trial_end IS NOT NULL
  AND trial_end <= NOW();
