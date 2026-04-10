-- supabase_migrations/20260323000001_drop_is_scheduled_column.sql
-- Description: Remove the unused is_scheduled column from the transactions table.
--   1. Drop the index on is_scheduled
--   2. Recreate calculate_financial_health_score without is_scheduled filters
--   3. Recreate get_category_benchmarks without is_scheduled filters
--   4. Drop the is_scheduled column

-- ============================================
-- 1. Drop the index
-- ============================================
DROP INDEX IF EXISTS idx_transactions_is_scheduled;

-- ============================================
-- 2. Recreate calculate_financial_health_score
--    (latest version from 20260303000002, with is_scheduled filters removed)
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
        AND date::DATE < v_month_end;

    SELECT COALESCE(SUM(COALESCE(base_amount, amount * COALESCE(exchange_rate, 1.0))), 0) INTO v_total_expenses
    FROM public.transactions
    WHERE user_id = p_user_id
        AND type = 'expense'
        AND date::DATE >= v_month_start
        AND date::DATE < v_month_end;

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
                     AND t3.date::DATE < v_month_end),
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

GRANT EXECUTE ON FUNCTION calculate_financial_health_score(UUID, DATE) TO authenticated;

-- ============================================
-- 3. Recreate get_category_benchmarks
--    (latest version from 20260303000003, with is_scheduled filters removed)
-- ============================================
CREATE OR REPLACE FUNCTION get_category_benchmarks(
  p_user_id UUID,
  p_months  INTEGER DEFAULT 6
)
RETURNS TABLE (
  category_id             UUID,
  category_name           TEXT,
  avg_monthly_spending    NUMERIC,
  std_deviation           NUMERIC,
  lower_threshold         NUMERIC,
  upper_threshold         NUMERIC,
  current_month_spending  NUMERIC,
  months_with_data        INTEGER,
  status                  TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_current_month_start DATE;
  v_period_start        DATE;
BEGIN
  v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
  v_period_start        := (v_current_month_start - (p_months || ' months')::INTERVAL)::DATE;

  RETURN QUERY
  WITH monthly_spending AS (
    SELECT
      t.category_id,
      DATE_TRUNC('month', t.date::DATE) AS month,
      SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS total_amount
    FROM public.transactions t
    WHERE t.user_id       = p_user_id
      AND t.type          = 'expense'
      AND t.date::DATE    < v_current_month_start
      AND t.category_id   IS NOT NULL
    GROUP BY t.category_id, DATE_TRUNC('month', t.date::DATE)
  ),
  ranked_months AS (
    SELECT
      ms.category_id,
      ms.month,
      ms.total_amount,
      ROW_NUMBER() OVER (PARTITION BY ms.category_id ORDER BY ms.month DESC) AS month_rank
    FROM monthly_spending ms
  ),
  category_stats AS (
    SELECT
      rm.category_id,
      AVG(rm.total_amount)                    AS avg_spending,
      COALESCE(STDDEV_POP(rm.total_amount), 0) AS std_dev,
      COUNT(*)::INTEGER                        AS data_months
    FROM ranked_months rm
    WHERE rm.month_rank <= p_months
    GROUP BY rm.category_id
    HAVING COUNT(*) >= 1
  ),
  current_spending AS (
    SELECT
      t.category_id,
      SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS current_amount
    FROM public.transactions t
    WHERE t.user_id      = p_user_id
      AND t.type         = 'expense'
      AND t.date::DATE   >= v_current_month_start
      AND t.date::DATE   <  (v_current_month_start + INTERVAL '1 month')::DATE
      AND t.category_id  IS NOT NULL
    GROUP BY t.category_id
  )
  SELECT
    COALESCE(cs.category_id, curr.category_id)                           AS category_id,
    c.name                                                               AS category_name,
    COALESCE(ROUND(cs.avg_spending, 2), 0)                               AS avg_monthly_spending,
    COALESCE(ROUND(cs.std_dev, 2), 0)                                    AS std_deviation,
    COALESCE(ROUND(GREATEST(0, cs.avg_spending - CASE WHEN cs.std_dev = 0 THEN cs.avg_spending * 0.2 ELSE cs.std_dev END), 2), 0) AS lower_threshold,
    COALESCE(ROUND(cs.avg_spending + CASE WHEN cs.std_dev = 0 THEN cs.avg_spending * 0.2 ELSE cs.std_dev END, 2), 0) AS upper_threshold,
    COALESCE(ROUND(curr.current_amount, 2), 0)                           AS current_month_spending,
    COALESCE(cs.data_months, 0)                                          AS months_with_data,
    CASE
      WHEN cs.category_id IS NULL                                                 THEN 'new'
      WHEN COALESCE(curr.current_amount, 0) < GREATEST(0, cs.avg_spending - CASE WHEN cs.std_dev = 0 THEN cs.avg_spending * 0.2 ELSE cs.std_dev END) THEN 'below'
      WHEN COALESCE(curr.current_amount, 0) > cs.avg_spending + CASE WHEN cs.std_dev = 0 THEN cs.avg_spending * 0.2 ELSE cs.std_dev END THEN 'above'
      ELSE 'within'
    END AS status
  FROM category_stats cs
  FULL OUTER JOIN current_spending curr ON cs.category_id = curr.category_id
  JOIN public.categories c ON c.id = COALESCE(cs.category_id, curr.category_id)
  WHERE c.user_id = p_user_id
  ORDER BY COALESCE(cs.avg_spending, curr.current_amount, 0) DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION get_category_benchmarks(UUID, INTEGER) TO authenticated;

-- ============================================
-- 4. Drop the column
-- ============================================
ALTER TABLE public.transactions DROP COLUMN IF EXISTS is_scheduled;
