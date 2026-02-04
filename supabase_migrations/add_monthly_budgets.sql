-- ============================================
-- Monthly Per-Category Budgets Migration
-- Created: 2026-02-04
-- ============================================

-- 1. Create budgets table
CREATE TABLE IF NOT EXISTS budgets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    category_id UUID NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    year INTEGER NOT NULL CHECK (year BETWEEN 2020 AND 2100),
    month INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- One budget per category per month per user
    CONSTRAINT unique_user_category_month UNIQUE (user_id, category_id, year, month)
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_budgets_user_id ON budgets(user_id);
CREATE INDEX IF NOT EXISTS idx_budgets_user_year_month ON budgets(user_id, year, month);

-- 3. Enable Row Level Security
ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policy (combined USING + WITH CHECK, matching goals table pattern)
DROP POLICY IF EXISTS "Users can manage their own budgets" ON budgets;
CREATE POLICY "Users can manage their own budgets"
    ON budgets
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 5. Grant permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON budgets TO authenticated;
