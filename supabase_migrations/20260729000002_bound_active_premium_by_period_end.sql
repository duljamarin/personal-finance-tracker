-- Migration: Bound 'active' premium access by current_period_end
--
-- Problem: the is_premium expression grants access on a bare `status = 'active'`
--   with no date condition. Every other status is date-bounded:
--
--       s.status IN ('past_due','cancelled')
--       AND s.current_period_end > NOW()
--
--   ...but 'active' is not. Access control therefore depends entirely on a
--   Paddle webhook arriving to move the row off 'active'. If that event is
--   dropped (endpoint down, function cold-start timeout, `subscription.expired`
--   not enabled in the Paddle dashboard, or an unhandled throw returning 500
--   past Paddle's retry budget) the row stays 'active' forever and the user
--   keeps premium indefinitely without paying.
--
--   This fails OPEN. By contrast a row that reached 'past_due' before the
--   dropped event self-corrects, because that branch checks the date.
--
-- Fix: date-bound the 'active' branch too, so a lost webhook costs a stale
--   status string rather than unbounded free access.
--
--   The `current_period_end IS NULL` guard is load-bearing: subscription.created
--   can land before a billing period is known, and card-free trials never have
--   one. Without it, new paying subscribers would be locked out immediately.
--
-- Note: this only changes how access is READ. Renewal itself is unaffected -
--   Paddle charges the card automatically at period end and subscription.updated
--   writes a fresh current_period_end, which keeps this condition satisfied.

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
    IF p_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Unauthorized: cannot access another user''s subscription'
            USING ERRCODE = 'P0003';
    END IF;

    -- Best-effort auto-expire of lapsed trials (see 20260729000001).
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
        (
            -- Active AND still inside the paid period. NULL period_end means the
            -- billing period is not known yet (fresh checkout) - allow it.
            (
                s.status = 'active'
                AND (s.current_period_end IS NULL OR s.current_period_end > NOW())
            )
            OR (s.status = 'trialing' AND (s.trial_end IS NULL OR s.trial_end > NOW()))
            OR (
                s.status IN ('past_due', 'cancelled')
                AND s.current_period_end IS NOT NULL
                AND s.current_period_end > NOW()
            )
        ) AS is_premium,
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
