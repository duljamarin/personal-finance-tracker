-- Migration: Add Monthly Financial Health Score
-- Creates table to store scores and function to calculate them

-- Table to store calculated health scores per user per month
CREATE TABLE IF NOT EXISTS financial_health_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Month identifier (first day of month)
    month_date DATE NOT NULL,
    
    -- Component scores (0-100 each)
    budget_adherence_score NUMERIC(5, 2) DEFAULT 0,
    income_expense_ratio_score NUMERIC(5, 2) DEFAULT 0,
    spending_volatility_score NUMERIC(5, 2) DEFAULT 0,
    savings_consistency_score NUMERIC(5, 2) DEFAULT 0,
    
    -- Final weighted score (0-100)
    total_score NUMERIC(5, 2) DEFAULT 0,
    
    -- Raw data for insights
    total_income NUMERIC(12, 2) DEFAULT 0,
    total_expenses NUMERIC(12, 2) DEFAULT 0,
    savings_amount NUMERIC(12, 2) DEFAULT 0,
    categories_over_budget INTEGER DEFAULT 0,
    categories_within_budget INTEGER DEFAULT 0,
    
    -- Insights stored as JSON array
    insights JSONB DEFAULT '[]'::JSONB,
    
    -- Timestamps
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Unique constraint: one score per user per month
    CONSTRAINT unique_user_month UNIQUE (user_id, month_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_health_scores_user_id ON financial_health_scores(user_id);
CREATE INDEX IF NOT EXISTS idx_health_scores_month ON financial_health_scores(month_date DESC);
CREATE INDEX IF NOT EXISTS idx_health_scores_user_month ON financial_health_scores(user_id, month_date DESC);

-- Enable Row Level Security
ALTER TABLE financial_health_scores ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own health scores" 
    ON financial_health_scores FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own health scores" 
    ON financial_health_scores FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own health scores" 
    ON financial_health_scores FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own health scores" 
    ON financial_health_scores FOR DELETE 
    USING (auth.uid() = user_id);

-- Main function to calculate financial health score
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
) AS $$
DECLARE
    v_month_start DATE;
    v_month_end DATE;
    v_total_income NUMERIC := 0;
    v_total_expenses NUMERIC := 0;
    v_savings NUMERIC := 0;
    
    -- Component scores
    v_budget_score NUMERIC := 0;
    v_ratio_score NUMERIC := 0;
    v_volatility_score NUMERIC := 0;
    v_savings_score NUMERIC := 0;
    v_final_score NUMERIC := 0;
    
    -- Budget tracking
    v_categories_over INTEGER := 0;
    v_categories_within INTEGER := 0;
    v_total_categories INTEGER := 0;
    
    -- Volatility calculation
    v_avg_volatility NUMERIC := 0;
    
    -- Savings consistency
    v_months_with_savings INTEGER := 0;
    v_lookback_months INTEGER := 6;
    
    -- Insights array
    v_insights JSONB := '[]'::JSONB;
    v_insight_text TEXT;
BEGIN
    -- Calculate month boundaries
    v_month_start := DATE_TRUNC('month', p_month)::DATE;
    v_month_end := (v_month_start + INTERVAL '1 month')::DATE;
    
    -- ========================================
    -- 1. Calculate total income and expenses
    -- ========================================
    SELECT COALESCE(SUM(COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0))), 0) INTO v_total_income
    FROM transactions
    WHERE user_id = p_user_id
        AND type = 'income'
        AND date::DATE >= v_month_start
        AND date::DATE < v_month_end
        AND (is_scheduled IS NULL OR is_scheduled = false);
    
    SELECT COALESCE(SUM(COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0))), 0) INTO v_total_expenses
    FROM transactions
    WHERE user_id = p_user_id
        AND type = 'expense'
        AND date::DATE >= v_month_start
        AND date::DATE < v_month_end
        AND (is_scheduled IS NULL OR is_scheduled = false);
    
    v_savings := v_total_income - v_total_expenses;
    
    -- ========================================
    -- 2. BUDGET ADHERENCE (40% weight)
    -- Compare current spending to historical averages per category
    -- ========================================
    WITH category_benchmarks AS (
        SELECT 
            c.id AS category_id,
            c.name AS category_name,
            -- Historical average (last 6 months)
            COALESCE(
                (SELECT AVG(monthly_total)
                 FROM (
                     SELECT SUM(COALESCE(t2.base_amount, t2.amount * COALESCE(t2.exchange_rate, 1.0))) AS monthly_total
                     FROM transactions t2
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
            -- Current month spending
            COALESCE(
                (SELECT SUM(COALESCE(t3.base_amount, t3.amount * COALESCE(t3.exchange_rate, 1.0)))
                 FROM transactions t3
                 WHERE t3.user_id = p_user_id
                     AND t3.category_id = c.id
                     AND t3.type = 'expense'
                     AND t3.date::DATE >= v_month_start
                     AND t3.date::DATE < v_month_end
                     AND (t3.is_scheduled IS NULL OR t3.is_scheduled = false)),
                0
            ) AS current_spending
        FROM categories c
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
    
    -- Budget score: 100 if all within budget, decreases with overruns
    IF v_total_categories > 0 THEN
        v_budget_score := GREATEST(0, LEAST(100, 
            (v_categories_within::NUMERIC / v_total_categories) * 100
        ));
    ELSE
        v_budget_score := 50; -- Neutral if no data
    END IF;
    
    -- ========================================
    -- 3. INCOME VS EXPENSES RATIO (30% weight)
    -- Ideal: expenses <= 80% of income (score 100)
    -- Warning: expenses 80-100% of income (score 50-100)
    -- Bad: expenses > income (score 0-50)
    -- ========================================
    IF v_total_income > 0 THEN
        DECLARE
            v_expense_ratio NUMERIC;
        BEGIN
            v_expense_ratio := v_total_expenses / v_total_income;
            
            IF v_expense_ratio <= 0.5 THEN
                v_ratio_score := 100;
            ELSIF v_expense_ratio <= 0.8 THEN
                -- Linear interpolation: 0.5 ratio = 100, 0.8 ratio = 80
                v_ratio_score := 100 - ((v_expense_ratio - 0.5) / 0.3) * 20;
            ELSIF v_expense_ratio <= 1.0 THEN
                -- Linear interpolation: 0.8 ratio = 80, 1.0 ratio = 50
                v_ratio_score := 80 - ((v_expense_ratio - 0.8) / 0.2) * 30;
            ELSE
                -- Over spending: ratio > 1.0, score decreases to 0
                v_ratio_score := GREATEST(0, 50 - ((v_expense_ratio - 1.0) * 50));
            END IF;
        END;
    ELSE
        -- No income recorded
        IF v_total_expenses > 0 THEN
            v_ratio_score := 20; -- Low score if spending without income
        ELSE
            v_ratio_score := 50; -- Neutral if no activity
        END IF;
    END IF;
    
    -- ========================================
    -- 4. SPENDING VOLATILITY (20% weight)
    -- Measures consistency - lower volatility = better score
    -- Compare current month to average and standard deviation
    -- ========================================
    WITH monthly_category_spending AS (
        SELECT 
            c.id AS category_id,
            DATE_TRUNC('month', t.date) AS month,
            COALESCE(SUM(COALESCE(t.base_amount, t.amount * COALESCE(t.exchange_rate, 1.0))), 0) AS total
        FROM categories c
        LEFT JOIN transactions t ON t.category_id = c.id
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
    
    -- Convert volatility to score: CV of 0 = 100, CV of 1+ = 0
    v_volatility_score := GREATEST(0, LEAST(100, (1 - v_avg_volatility) * 100));
    
    -- ========================================
    -- 5. SAVINGS CONSISTENCY (10% weight)
    -- Rewards consistent monthly savings over past 6 months
    -- ========================================
    WITH monthly_savings AS (
        SELECT 
            DATE_TRUNC('month', date) AS month,
            SUM(CASE WHEN type = 'income' THEN COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0)) ELSE 0 END) -
            SUM(CASE WHEN type = 'expense' THEN COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0)) ELSE 0 END) AS net_savings
        FROM transactions
        WHERE user_id = p_user_id
            AND date::DATE >= (v_month_start - INTERVAL '6 months')
            AND date::DATE < v_month_end
            AND (is_scheduled IS NULL OR is_scheduled = false)
        GROUP BY DATE_TRUNC('month', date)
    )
    SELECT COUNT(*) INTO v_months_with_savings
    FROM monthly_savings
    WHERE net_savings > 0;
    
    -- Score based on months with positive savings (out of up to 7 months including current)
    v_savings_score := LEAST(100, (v_months_with_savings::NUMERIC / 7) * 100);
    
    -- If current month has savings, bonus points
    IF v_savings > 0 THEN
        v_savings_score := LEAST(100, v_savings_score + 15);
    END IF;
    
    -- ========================================
    -- 6. CALCULATE FINAL WEIGHTED SCORE
    -- ========================================
    v_final_score := ROUND(
        (v_budget_score * 0.40) +
        (v_ratio_score * 0.30) +
        (v_volatility_score * 0.20) +
        (v_savings_score * 0.10),
        1
    );
    
    -- ========================================
    -- 7. GENERATE INSIGHTS DATA (not text - let frontend handle i18n)
    -- ========================================
    
    -- Insight 1: Income vs Expenses
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
            v_insights := v_insights || jsonb_build_object(
                'type', 'income_expense',
                'status', 'no_income'
            );
        ELSE
            v_insights := v_insights || jsonb_build_object(
                'type', 'income_expense',
                'status', 'no_data'
            );
        END IF;
    END IF;
    
    -- Insight 2: Budget Status
    IF v_total_categories > 0 THEN
        IF v_categories_over = 0 THEN
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget',
                'status', 'all_good',
                'totalCategories', v_total_categories
            );
        ELSIF v_categories_over = 1 THEN
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget',
                'status', 'one_over',
                'categoriesOver', v_categories_over
            );
        ELSE
            v_insights := v_insights || jsonb_build_object(
                'type', 'budget',
                'status', 'multiple_over',
                'categoriesOver', v_categories_over
            );
        END IF;
    ELSE
        v_insights := v_insights || jsonb_build_object(
            'type', 'budget',
            'status', 'no_data'
        );
    END IF;
    
    -- Insight 3: Simple savings status
    v_insights := v_insights || jsonb_build_object(
        'type', 'savings',
        'status', CASE 
            WHEN v_savings > 0 THEN 'saving'
            WHEN v_savings < 0 THEN 'overspending'
            ELSE 'breaking_even'
        END,
        'amount', ROUND(ABS(v_savings), 2)
    );
    
    -- Return results
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate and store the health score
CREATE OR REPLACE FUNCTION store_financial_health_score(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE
)
RETURNS financial_health_scores AS $$
DECLARE
    v_result RECORD;
    v_stored_record financial_health_scores;
BEGIN
    -- Calculate the score
    SELECT * INTO v_result
    FROM calculate_financial_health_score(p_user_id, p_month);
    
    -- Upsert the result
    INSERT INTO financial_health_scores (
        user_id,
        month_date,
        budget_adherence_score,
        income_expense_ratio_score,
        spending_volatility_score,
        savings_consistency_score,
        total_score,
        total_income,
        total_expenses,
        savings_amount,
        categories_over_budget,
        categories_within_budget,
        insights,
        calculated_at
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
        budget_adherence_score = EXCLUDED.budget_adherence_score,
        income_expense_ratio_score = EXCLUDED.income_expense_ratio_score,
        spending_volatility_score = EXCLUDED.spending_volatility_score,
        savings_consistency_score = EXCLUDED.savings_consistency_score,
        total_score = EXCLUDED.total_score,
        total_income = EXCLUDED.total_income,
        total_expenses = EXCLUDED.total_expenses,
        savings_amount = EXCLUDED.savings_amount,
        categories_over_budget = EXCLUDED.categories_over_budget,
        categories_within_budget = EXCLUDED.categories_within_budget,
        insights = EXCLUDED.insights,
        calculated_at = NOW()
    RETURNING * INTO v_stored_record;
    
    RETURN v_stored_record;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Wrapper function for RPC call (calculates and stores in one call)
CREATE OR REPLACE FUNCTION get_financial_health_score(
    p_user_id UUID,
    p_month DATE DEFAULT DATE_TRUNC('month', CURRENT_DATE)::DATE,
    p_force_recalculate BOOLEAN DEFAULT false
)
RETURNS SETOF financial_health_scores AS $$
DECLARE
    v_existing financial_health_scores;
    v_month_start DATE;
BEGIN
    v_month_start := DATE_TRUNC('month', p_month)::DATE;
    
    -- Check if we have a recent calculation (within last hour) unless forced
    IF NOT p_force_recalculate THEN
        SELECT * INTO v_existing
        FROM financial_health_scores
        WHERE user_id = p_user_id
            AND month_date = v_month_start
            AND calculated_at > NOW() - INTERVAL '1 hour';
        
        IF FOUND THEN
            RETURN NEXT v_existing;
            RETURN;
        END IF;
    END IF;
    
    -- Calculate and store fresh score
    RETURN QUERY SELECT * FROM store_financial_health_score(p_user_id, p_month);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get score history
CREATE OR REPLACE FUNCTION get_health_score_history(
    p_user_id UUID,
    p_months INTEGER DEFAULT 12
)
RETURNS SETOF financial_health_scores AS $$
BEGIN
    RETURN QUERY
    SELECT *
    FROM financial_health_scores
    WHERE user_id = p_user_id
    ORDER BY month_date DESC
    LIMIT p_months;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION calculate_financial_health_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION store_financial_health_score(UUID, DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION get_financial_health_score(UUID, DATE, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION get_health_score_history(UUID, INTEGER) TO authenticated;
