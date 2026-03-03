-- Migration: Fix Function Search Path Mutable security warnings
-- Adds SET search_path to all functions to prevent schema injection attacks
-- Created: 2026-03-03

-- ============================================
-- 1. update_subscriptions_updated_at (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION update_subscriptions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- 2. update_assets_updated_at (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- 3. update_recurring_transactions_updated_at (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================
-- 4. calculate_next_run_date (pure function)
--    Original returns DATE. Must DROP first because CREATE OR REPLACE cannot
--    change an existing function's return type.
-- ============================================
DROP FUNCTION IF EXISTS calculate_next_run_date(DATE, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION calculate_next_run_date(
    p_current_date DATE,
    p_frequency TEXT,
    p_interval_count INTEGER
)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
    CASE p_frequency
        WHEN 'daily' THEN
            RETURN p_current_date + (p_interval_count || ' days')::INTERVAL;
        WHEN 'weekly' THEN
            RETURN p_current_date + (p_interval_count || ' weeks')::INTERVAL;
        WHEN 'monthly' THEN
            RETURN p_current_date + (p_interval_count || ' months')::INTERVAL;
        WHEN 'yearly' THEN
            RETURN p_current_date + (p_interval_count || ' years')::INTERVAL;
        ELSE
            RETURN p_current_date + (p_interval_count || ' days')::INTERVAL;
    END CASE;
END;
$$;

-- ============================================
-- 5. update_goal_current_amount (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION update_goal_current_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    total_contributions NUMERIC;
BEGIN
    SELECT COALESCE(SUM(amount), 0)
    INTO total_contributions
    FROM public.goal_contributions
    WHERE goal_id = COALESCE(NEW.goal_id, OLD.goal_id);
    
    UPDATE public.goals
    SET current_amount = total_contributions,
        updated_at = NOW()
    WHERE id = COALESCE(NEW.goal_id, OLD.goal_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================
-- 6. check_milestone_completion (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION check_milestone_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    UPDATE public.goal_milestones
    SET is_completed = TRUE,
        completed_at = NOW()
    WHERE goal_id = NEW.id
      AND is_completed = FALSE
      AND target_amount <= NEW.current_amount;
    
    RETURN NEW;
END;
$$;

-- ============================================
-- 7. check_transaction_limit (trigger function)
-- ============================================
CREATE OR REPLACE FUNCTION check_transaction_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    user_is_premium BOOLEAN;
    monthly_count INTEGER;
    free_limit CONSTANT INTEGER := 30;
BEGIN
    -- Check if user has an active/trialing subscription OR is within their paid period
    SELECT EXISTS (
        SELECT 1 FROM public.subscriptions s
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

    -- Count transactions this month for free users
    SELECT COUNT(*) INTO monthly_count
    FROM public.transactions
    WHERE user_id = NEW.user_id
        AND date >= date_trunc('month', CURRENT_DATE)::DATE
        AND date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::DATE;

    IF monthly_count >= free_limit THEN
        RAISE EXCEPTION 'Monthly transaction limit reached. Upgrade to premium for unlimited transactions.'
            USING ERRCODE = 'P0001';
    END IF;

    RETURN NEW;
END;
$$;

-- ============================================
-- 8. calculate_financial_health_score (RPC function)
--    Must DROP first â€” return type differs from what was incorrectly stored.
-- ============================================
DROP FUNCTION IF EXISTS calculate_financial_health_score(UUID, DATE);

CREATE OR REPLACE FUNCTION calculate_financial_health_score(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS TABLE (
    total_score NUMERIC,
    budget_adherence_score NUMERIC,
    income_expense_ratio_score NUMERIC,
    spending_volatility_score NUMERIC,
    savings_consistency_score NUMERIC,
    total_income NUMERIC,
    total_expenses NUMERIC,
    savings_amount NUMERIC,
    categories_over_budget INTEGER,
    categories_within_budget INTEGER,
    insights JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_total_income NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_savings NUMERIC := 0;
    v_budget_score NUMERIC := 0;
    v_ratio_score NUMERIC := 0;
    v_volatility_score NUMERIC := 0;
    v_savings_score NUMERIC := 0;
    v_final_score NUMERIC := 0;
    v_categories_over INTEGER := 0;
    v_categories_within INTEGER := 0;
    v_total_categories INTEGER := 0;
    v_avg_volatility NUMERIC := 0;
    v_months_with_savings INTEGER := 0;
    v_lookback_months INTEGER := 6;
    v_insights JSONB := '[]'::JSONB;
    v_insight_text TEXT;
BEGIN
    v_month_start := DATE_TRUNC('month', p_month)::DATE;
    v_month_end := (v_month_start + INTERVAL '1 month')::DATE;

    SELECT COALESCE(SUM(COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0))), 0) INTO v_total_income
    FROM public.transactions
    WHERE user_id = p_user_id
        AND type = 'income'
        AND date::DATE >= v_month_start
        AND date::DATE < v_month_end
        AND (is_scheduled IS NULL OR is_scheduled = false);

    SELECT COALESCE(SUM(COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0))), 0) INTO v_total_expenses
    FROM public.transactions
    WHERE user_id = p_user_id
        AND type = 'expense'
        AND date::DATE >= v_month_start
        AND date::DATE < v_month_end
        AND (is_scheduled IS NULL OR is_scheduled = false);

    v_savings := v_total_income - v_total_expenses;

    WITH category_benchmarks AS (
        SELECT
            c.id AS category_id,
            c.name AS category_name,
            COALESCE(
                (SELECT AVG(monthly_total)
                 FROM (
                     SELECT SUM(COALESCE(t2.base_amount, t2.amount * COALESCE(t2.exchange_rate, 1.0))) AS monthly_total
                     FROM public.transactions t2
                     WHERE t2.user_id = p_user_id
                         AND t2.category_id = c.id
                         AND t2.type = 'expense'
                         AND t2.date::DATE >= (v_month_start - INTERVAL '6 months')
                         AND t2.date::DATE < v_month_start
                         AND (t2.is_scheduled IS NULL OR t2.is_scheduled = false)
                     GROUP BY DATE_TRUNC('month', t2.date)
                 ) monthly_totals),
                0
            ) AS avg_spending,
            COALESCE(
                (SELECT SUM(COALESCE(t3.base_amount, t3.amount * COALESCE(t3.exchange_rate, 1.0)))
                 FROM public.transactions t3
                 WHERE t3.user_id = p_user_id
                     AND t3.category_id = c.id
                     AND t3.type = 'expense'
                     AND t3.date::DATE >= v_month_start
                     AND t3.date::DATE < v_month_end
                     AND (t3.is_scheduled IS NULL OR t3.is_scheduled = false)),
                0
            ) AS current_spending
        FROM public.categories c
        WHERE c.user_id = p_user_id
    ),
    budget_analysis AS (
        SELECT
            category_id,
            category_name,
            avg_spending,
            current_spending,
            CASE
                WHEN avg_spending = 0 THEN 'within'
                WHEN current_spending <= avg_spending * 1.1 THEN 'within'
                ELSE 'over'
            END AS status
        FROM category_benchmarks
        WHERE avg_spending > 0 OR current_spending > 0
    )
    SELECT
        COUNT(*) FILTER (WHERE status = 'over'),
        COUNT(*) FILTER (WHERE status = 'within'),
        COUNT(*)
    INTO v_categories_over, v_categories_within, v_total_categories
    FROM budget_analysis;

    IF v_total_categories > 0 THEN
        v_budget_score := GREATEST(0, LEAST(100,
            (v_categories_within::NUMERIC / v_total_categories) * 100
        ));
    ELSE
        v_budget_score := 50;
    END IF;

    IF v_total_income > 0 THEN
        DECLARE
            v_expense_ratio NUMERIC;
        BEGIN
            v_expense_ratio := v_total_expenses / v_total_income;
            IF v_expense_ratio <= 0.5 THEN
                v_ratio_score := 100;
            ELSIF v_expense_ratio <= 0.8 THEN
                v_ratio_score := 100 - ((v_expense_ratio - 0.5) / 0.3) * 20;
            ELSIF v_expense_ratio <= 1.0 THEN
                v_ratio_score := 80 - ((v_expense_ratio - 0.8) / 0.2) * 30;
            ELSE
                v_ratio_score := GREATEST(0, 50 - ((v_expense_ratio - 1.0) * 50));
            END IF;
        END;
    ELSE
        IF v_total_expenses > 0 THEN
            v_ratio_score := 20;
        ELSE
            v_ratio_score := 50;
        END IF;
    END IF;

    WITH monthly_category_spending AS (
        SELECT
            c.id AS category_id,
            DATE_TRUNC('month', t.date) AS month,
            COALESCE(SUM(COALESCE(t.base_amount, t.amount * COALESCE(t.exchange_rate, 1.0))), 0) AS total
        FROM public.categories c
        LEFT JOIN public.transactions t ON t.category_id = c.id
            AND t.user_id = p_user_id
            AND t.type = 'expense'
            AND t.date::DATE >= (v_month_start - INTERVAL '6 months')
            AND t.date::DATE < v_month_end
            AND (t.is_scheduled IS NULL OR t.is_scheduled = false)
        WHERE c.user_id = p_user_id
        GROUP BY c.id, DATE_TRUNC('month', t.date)
    ),
    category_volatility AS (
        SELECT
            category_id,
            COALESCE(STDDEV_POP(total), 0) AS std_dev,
            COALESCE(AVG(total), 0) AS avg_spending,
            CASE
                WHEN AVG(total) > 0 THEN COALESCE(STDDEV_POP(total), 0) / AVG(total)
                ELSE 0
            END AS coefficient_of_variation
        FROM monthly_category_spending
        WHERE month IS NOT NULL
        GROUP BY category_id
        HAVING AVG(total) > 0
    )
    SELECT COALESCE(AVG(coefficient_of_variation), 0.5) INTO v_avg_volatility
    FROM category_volatility;

    v_volatility_score := GREATEST(0, LEAST(100, (1 - v_avg_volatility) * 100));

    WITH monthly_savings AS (
        SELECT
            DATE_TRUNC('month', date) AS month,
            SUM(CASE WHEN type = 'income' THEN COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0)) ELSE 0 END) -
            SUM(CASE WHEN type = 'expense' THEN COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0)) ELSE 0 END) AS net_savings
        FROM public.transactions
        WHERE user_id = p_user_id
            AND date::DATE >= (v_month_start - INTERVAL '6 months')
            AND date::DATE < v_month_end
            AND (is_scheduled IS NULL OR is_scheduled = false)
        GROUP BY DATE_TRUNC('month', date)
    )
    SELECT COUNT(*) INTO v_months_with_savings
    FROM monthly_savings
    WHERE net_savings > 0;

    v_savings_score := LEAST(100, (v_months_with_savings::NUMERIC / 7) * 100);

    IF v_savings > 0 THEN
        v_savings_score := LEAST(100, v_savings_score + 15);
    END IF;

    v_final_score := ROUND(
        (v_budget_score * 0.40) +
        (v_ratio_score * 0.30) +
        (v_volatility_score * 0.20) +
        (v_savings_score * 0.10),
        1
    );

    IF v_total_income > 0 THEN
        IF v_savings > 0 THEN
            v_insights := v_insights || jsonb_build_object(
                'type', 'income_expense',
                'status', 'positive',
                'savings', ROUND(v_savings, 2),
                'savingsPercent', ROUND((v_savings / v_total_income) * 100)
            );
        ELSE
            v_insights := v_insights || jsonb_build_object(
                'type', 'income_expense',
                'status', 'negative',
                'overspent', ROUND(ABS(v_savings), 2)
            );
        END IF;
    ELSE
        IF v_total_expenses > 0 THEN
            v_insights := v_insights || jsonb_build_object('type', 'income_expense', 'status', 'no_income');
        ELSE
            v_insights := v_insights || jsonb_build_object('type', 'income_expense', 'status', 'no_data');
        END IF;
    END IF;

    IF v_total_categories > 0 THEN
        IF v_categories_over = 0 THEN
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget', 'status', 'all_good', 'totalCategories', v_total_categories);
        ELSIF v_categories_over = 1 THEN
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget', 'status', 'one_over', 'categoriesOver', v_categories_over);
        ELSE
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget', 'status', 'multiple_over', 'categoriesOver', v_categories_over);
        END IF;
    ELSE
        v_insights := v_insights || jsonb_build_object('type', 'budget', 'status', 'no_data');
    END IF;

    v_insights := v_insights || jsonb_build_object(
        'type', 'savings',
        'status', CASE
            WHEN v_savings > 0 THEN 'saving'
            WHEN v_savings < 0 THEN 'overspending'
            ELSE 'breaking_even'
        END,
        'amount', ROUND(ABS(v_savings), 2)
    );

    RETURN QUERY SELECT
        v_final_score,
        ROUND(v_budget_score, 1),
        ROUND(v_ratio_score, 1),
        ROUND(v_volatility_score, 1),
        ROUND(v_savings_score, 1),
        v_total_income,
        v_total_expenses,
        v_savings,
        v_categories_over,
        v_categories_within,
        v_insights;
END;
$$;

-- ============================================
-- 9. store_financial_health_score (RPC function)
--    Must DROP first â€” previous incorrect version had 13 parameters.
-- ============================================
DROP FUNCTION IF EXISTS store_financial_health_score(UUID, DATE, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, INTEGER, INTEGER, TEXT[]);
DROP FUNCTION IF EXISTS store_financial_health_score(UUID, DATE);

CREATE OR REPLACE FUNCTION store_financial_health_score(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS public.financial_health_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_result RECORD;
    v_stored_record public.financial_health_scores;
BEGIN
    SELECT * INTO v_result
    FROM public.calculate_financial_health_score(p_user_id, p_month);

    INSERT INTO public.financial_health_scores (
        user_id, month_date,
        budget_adherence_score, income_expense_ratio_score,
        spending_volatility_score, savings_consistency_score,
        total_score, total_income, total_expenses, savings_amount,
        categories_over_budget, categories_within_budget,
        insights, calculated_at
    ) VALUES (
        p_user_id,
        DATE_TRUNC('month', p_month)::DATE,
        v_result.budget_adherence_score,
        v_result.income_expense_ratio_score,
        v_result.spending_volatility_score,
        v_result.savings_consistency_score,
        v_result.total_score,
        v_result.total_income,
        v_result.total_expenses,
        v_result.savings_amount,
        v_result.categories_over_budget,
        v_result.categories_within_budget,
        v_result.insights,
        NOW()
    )
    ON CONFLICT (user_id, month_date)
    DO UPDATE SET
        budget_adherence_score     = EXCLUDED.budget_adherence_score,
        income_expense_ratio_score = EXCLUDED.income_expense_ratio_score,
        spending_volatility_score  = EXCLUDED.spending_volatility_score,
        savings_consistency_score  = EXCLUDED.savings_consistency_score,
        total_score                = EXCLUDED.total_score,
        total_income               = EXCLUDED.total_income,
        total_expenses             = EXCLUDED.total_expenses,
        savings_amount             = EXCLUDED.savings_amount,
        categories_over_budget     = EXCLUDED.categories_over_budget,
        categories_within_budget   = EXCLUDED.categories_within_budget,
        insights                   = EXCLUDED.insights,
        calculated_at              = NOW()
    RETURNING * INTO v_stored_record;

    RETURN v_stored_record;
END;
$$;

-- ============================================
-- 10. get_financial_health_score (RPC function)
--     Must DROP first â€” previous incorrect version returned TABLE(...) not SETOF.
-- ============================================
DROP FUNCTION IF EXISTS get_financial_health_score(UUID, DATE, BOOLEAN);

CREATE OR REPLACE FUNCTION get_financial_health_score(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_force_recalculate BOOLEAN DEFAULT false
)
RETURNS SETOF public.financial_health_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_existing public.financial_health_scores;
    v_month_start DATE;
BEGIN
    v_month_start := DATE_TRUNC('month', p_month)::DATE;

    IF NOT p_force_recalculate THEN
        SELECT * INTO v_existing
        FROM public.financial_health_scores
        WHERE user_id = p_user_id
            AND month_date = v_month_start
            AND calculated_at > NOW() - INTERVAL '1 hour';

        IF FOUND THEN
            RETURN NEXT v_existing;
            RETURN;
        END IF;
    END IF;

    RETURN QUERY SELECT * FROM public.store_financial_health_score(p_user_id, p_month);
END;
$$;

-- ============================================
-- 11. get_health_score_history (RPC function)
--     Must DROP first â€” previous incorrect version returned TABLE(...) not SETOF.
-- ============================================
DROP FUNCTION IF EXISTS get_health_score_history(UUID, INTEGER);

CREATE OR REPLACE FUNCTION get_health_score_history(
    p_user_id UUID,
    p_months INTEGER DEFAULT 12
)
RETURNS SETOF public.financial_health_scores
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM public.financial_health_scores
    WHERE user_id = p_user_id
    ORDER BY month_date DESC
    LIMIT p_months;
END;
$$;

-- ============================================
-- Grant execute permissions to authenticated users for RPC functions
-- ============================================
GRANT EXECUTE ON FUNCTION calculate_financial_health_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION store_financial_health_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_health_score(UUID, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_score_history(UUID, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_next_run_date(DATE, TEXT, INTEGER) TO authenticated;

-- Note: Trigger functions are automatically executed with SECURITY DEFINER by default,
-- so no explicit GRANT is needed for them.

