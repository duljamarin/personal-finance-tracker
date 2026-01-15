-- Migration: Add Smart Category Benchmark Support
-- This migration creates an RPC function to calculate personalized spending benchmarks

-- Function to calculate category spending benchmarks
-- Returns average, standard deviation, and thresholds for each expense category
CREATE OR REPLACE FUNCTION get_category_benchmarks(
    p_user_id UUID,
    p_months INTEGER DEFAULT 6
)
RETURNS TABLE (
    category_id UUID,
    category_name TEXT,
    avg_monthly_spending NUMERIC,
    std_deviation NUMERIC,
    lower_threshold NUMERIC,
    upper_threshold NUMERIC,
    current_month_spending NUMERIC,
    months_with_data INTEGER,
    status TEXT
) AS $$
DECLARE
    v_current_month_start DATE;
    v_period_start DATE;
BEGIN
    -- Calculate date ranges
    -- Look back p_months from start of current month to ensure we have enough historical data
    v_current_month_start := DATE_TRUNC('month', CURRENT_DATE)::DATE;
    v_period_start := (v_current_month_start - (p_months || ' months')::INTERVAL)::DATE;
    
    RETURN QUERY
    WITH monthly_spending AS (
        -- Calculate spending per category per month for the analysis period
        -- Get the most recent p_months of data that exist (not necessarily consecutive)
        SELECT 
            t.category_id,
            DATE_TRUNC('month', t.date::DATE) AS month,
            SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS total_amount
        FROM transactions t
        WHERE t.user_id = p_user_id
            AND t.type = 'expense'
            AND t.date::DATE < v_current_month_start
            AND t.category_id IS NOT NULL
            AND t.is_scheduled = false
        GROUP BY t.category_id, DATE_TRUNC('month', t.date::DATE)
    ),
    ranked_months AS (
        -- Rank months for each category (most recent first)
        SELECT 
            ms.category_id,
            ms.month,
            ms.total_amount,
            ROW_NUMBER() OVER (PARTITION BY ms.category_id ORDER BY ms.month DESC) as month_rank
        FROM monthly_spending ms
    ),
    category_stats AS (
        -- Calculate statistics for each category using only the most recent p_months
        SELECT 
            rm.category_id,
            AVG(rm.total_amount) AS avg_spending,
            COALESCE(STDDEV_POP(rm.total_amount), 0) AS std_dev,
            COUNT(*)::INTEGER AS data_months
        FROM ranked_months rm
        WHERE rm.month_rank <= p_months
        GROUP BY rm.category_id
        HAVING COUNT(*) >= 1  -- Need at least 1 month of data
    ),
    current_spending AS (
        -- Get current month spending per category
        SELECT 
            t.category_id,
            SUM(t.amount * COALESCE(t.exchange_rate, 1.0)) AS current_amount
        FROM transactions t
        WHERE t.user_id = p_user_id
            AND t.type = 'expense'
            AND t.date::DATE >= v_current_month_start
            AND t.date::DATE < (v_current_month_start + INTERVAL '1 month')::DATE
            AND t.category_id IS NOT NULL
            AND t.is_scheduled = false
        GROUP BY t.category_id
    )
    SELECT 
        COALESCE(cs.category_id, curr.category_id) AS category_id,
        c.name AS category_name,
        COALESCE(ROUND(cs.avg_spending, 2), 0) AS avg_monthly_spending,
        COALESCE(ROUND(cs.std_dev, 2), 0) AS std_deviation,
        COALESCE(ROUND(GREATEST(0, cs.avg_spending - cs.std_dev), 2), 0) AS lower_threshold,
        COALESCE(ROUND(cs.avg_spending + cs.std_dev, 2), 0) AS upper_threshold,
        COALESCE(ROUND(curr.current_amount, 2), 0) AS current_month_spending,
        COALESCE(cs.data_months, 0) AS months_with_data,
        CASE 
            WHEN cs.category_id IS NULL THEN 'new'
            WHEN COALESCE(curr.current_amount, 0) < GREATEST(0, cs.avg_spending - cs.std_dev) THEN 'below'
            WHEN COALESCE(curr.current_amount, 0) > cs.avg_spending + cs.std_dev THEN 'above'
            ELSE 'within'
        END AS status
    FROM category_stats cs
    FULL OUTER JOIN current_spending curr ON cs.category_id = curr.category_id
    JOIN categories c ON c.id = COALESCE(cs.category_id, curr.category_id)
    WHERE c.user_id = p_user_id
    ORDER BY COALESCE(cs.avg_spending, curr.current_amount, 0) DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_category_benchmarks(UUID, INTEGER) TO authenticated;

-- Create an index to improve performance of benchmark queries
CREATE INDEX IF NOT EXISTS idx_transactions_benchmark 
ON transactions(user_id, type, date, category_id) 
WHERE type = 'expense' AND is_scheduled = false;

-- Add comment for documentation
COMMENT ON FUNCTION get_category_benchmarks IS 
'Calculates personalized spending benchmarks for each expense category.
Returns average monthly spending, standard deviation, and thresholds (avg ± 1 std dev).
Also includes current month spending and a status indicator (below/within/above).
Requires at least 2 months of historical data per category.';
