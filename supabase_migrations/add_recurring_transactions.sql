-- Migration: Add Recurring Transactions Support
-- This migration creates the recurring_transactions table and adds source_recurring_id to transactions

-- Create recurring_transactions table
CREATE TABLE IF NOT EXISTS recurring_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Transaction template data
    title TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
    tags TEXT[] DEFAULT '{}',
    currency_code TEXT DEFAULT 'EUR',
    exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
    
    -- Recurrence settings
    frequency TEXT NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')),
    interval_count INTEGER NOT NULL DEFAULT 1 CHECK (interval_count > 0),
    start_date DATE NOT NULL,
    end_date DATE, -- NULL means no end
    occurrences_limit INTEGER, -- NULL means no limit, otherwise stops after N occurrences
    occurrences_created INTEGER DEFAULT 0,
    
    -- Scheduling metadata
    next_run_at TIMESTAMPTZ,
    last_run_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source_recurring_id to transactions table to track generated instances
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS source_recurring_id UUID REFERENCES recurring_transactions(id) ON DELETE SET NULL;

-- Add is_scheduled flag to mark future-dated generated transactions
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS is_scheduled BOOLEAN DEFAULT false;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id ON recurring_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_next_run_at ON recurring_transactions(next_run_at) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_recurring_transactions_is_active ON recurring_transactions(is_active);
CREATE INDEX IF NOT EXISTS idx_transactions_source_recurring_id ON transactions(source_recurring_id);
CREATE INDEX IF NOT EXISTS idx_transactions_is_scheduled ON transactions(is_scheduled) WHERE is_scheduled = true;

-- Enable Row Level Security
ALTER TABLE recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for recurring_transactions
CREATE POLICY "Users can view own recurring transactions" 
    ON recurring_transactions FOR SELECT 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recurring transactions" 
    ON recurring_transactions FOR INSERT 
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recurring transactions" 
    ON recurring_transactions FOR UPDATE 
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recurring transactions" 
    ON recurring_transactions FOR DELETE 
    USING (auth.uid() = user_id);

-- Function to calculate next run date based on frequency
CREATE OR REPLACE FUNCTION calculate_next_run_date(
    p_current_date DATE,
    p_frequency TEXT,
    p_interval_count INTEGER
) RETURNS DATE AS $$
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
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_recurring_transactions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_recurring_transactions_updated_at
    BEFORE UPDATE ON recurring_transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_recurring_transactions_updated_at();

-- Comments for documentation
COMMENT ON TABLE recurring_transactions IS 'Stores recurring transaction rules/templates';
COMMENT ON COLUMN recurring_transactions.frequency IS 'Recurrence frequency: daily, weekly, monthly, yearly';
COMMENT ON COLUMN recurring_transactions.interval_count IS 'Number of frequency units between occurrences (e.g., every 2 weeks)';
COMMENT ON COLUMN recurring_transactions.next_run_at IS 'Next scheduled date to generate a transaction instance';
COMMENT ON COLUMN recurring_transactions.occurrences_limit IS 'Maximum number of occurrences to generate (NULL = unlimited)';
COMMENT ON COLUMN recurring_transactions.occurrences_created IS 'Count of transaction instances already created';
COMMENT ON COLUMN transactions.source_recurring_id IS 'Reference to the recurring transaction rule that generated this transaction';
COMMENT ON COLUMN transactions.is_scheduled IS 'True if this is a future-dated transaction generated from recurrence';
