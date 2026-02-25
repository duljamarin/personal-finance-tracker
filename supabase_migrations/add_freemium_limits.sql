-- ============================================
-- Freemium feature limits: budgets, recurring transactions, goals
-- Created: 2026-02-25
--
-- Adds server-side enforcement triggers for free-tier users:
-- 1. Budget limit: 3 per month
-- 2. Recurring transaction limit: 3 active
-- 3. Goal limit: 1 active
--
-- Follows the pattern from check_transaction_limit()
-- ============================================


-- ===========================================
-- Limit #1: Budget limit (3 per month for free users)
-- ===========================================

CREATE OR REPLACE FUNCTION check_budget_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_is_premium BOOLEAN;
    budget_count INTEGER;
    free_limit CONSTANT INTEGER := 3;
BEGIN
    -- Check if user has an active/trialing subscription OR is within their paid period
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = NEW.user_id
        AND (
            s.status IN ('active', 'trialing')
            OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
        )
    ) INTO user_is_premium;

    -- Premium users have no limit
    IF user_is_premium THEN
        RETURN NEW;
    END IF;

    -- Count budgets for this specific month
    SELECT COUNT(*) INTO budget_count
    FROM budgets
    WHERE user_id = NEW.user_id
        AND year = NEW.year
        AND month = NEW.month;

    IF budget_count >= free_limit THEN
        RAISE EXCEPTION 'Budget limit reached. Upgrade to premium for unlimited budgets.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_budget_limit ON budgets;
CREATE TRIGGER enforce_budget_limit
    BEFORE INSERT ON budgets
    FOR EACH ROW EXECUTE FUNCTION check_budget_limit();


-- ===========================================
-- Limit #2: Recurring transaction limit (3 active for free users)
-- ===========================================

CREATE OR REPLACE FUNCTION check_recurring_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_is_premium BOOLEAN;
    active_count INTEGER;
    free_limit CONSTANT INTEGER := 3;
BEGIN
    -- Check if user has an active/trialing subscription OR is within their paid period
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = NEW.user_id
        AND (
            s.status IN ('active', 'trialing')
            OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
        )
    ) INTO user_is_premium;

    -- Premium users have no limit
    IF user_is_premium THEN
        RETURN NEW;
    END IF;

    -- Count active recurring transactions
    SELECT COUNT(*) INTO active_count
    FROM recurring_transactions
    WHERE user_id = NEW.user_id
        AND is_active = true;

    IF active_count >= free_limit THEN
        RAISE EXCEPTION 'Recurring transaction limit reached. Upgrade to premium for unlimited recurring transactions.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_recurring_limit ON recurring_transactions;
CREATE TRIGGER enforce_recurring_limit
    BEFORE INSERT ON recurring_transactions
    FOR EACH ROW EXECUTE FUNCTION check_recurring_limit();


-- ===========================================
-- Limit #3: Goal limit (1 active for free users)
-- ===========================================

CREATE OR REPLACE FUNCTION check_goal_limit()
RETURNS TRIGGER AS $$
DECLARE
    user_is_premium BOOLEAN;
    active_count INTEGER;
    free_limit CONSTANT INTEGER := 1;
BEGIN
    -- Check if user has an active/trialing subscription OR is within their paid period
    SELECT EXISTS (
        SELECT 1 FROM subscriptions s
        WHERE s.user_id = NEW.user_id
        AND (
            s.status IN ('active', 'trialing')
            OR (s.current_period_end IS NOT NULL AND s.current_period_end > NOW())
        )
    ) INTO user_is_premium;

    -- Premium users have no limit
    IF user_is_premium THEN
        RETURN NEW;
    END IF;

    -- Count active non-completed goals
    SELECT COUNT(*) INTO active_count
    FROM goals
    WHERE user_id = NEW.user_id
        AND is_active = true
        AND is_completed = false;

    IF active_count >= free_limit THEN
        RAISE EXCEPTION 'Goal limit reached. Upgrade to premium for unlimited goals.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS enforce_goal_limit ON goals;
CREATE TRIGGER enforce_goal_limit
    BEFORE INSERT ON goals
    FOR EACH ROW EXECUTE FUNCTION check_goal_limit();
