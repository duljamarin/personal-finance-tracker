-- ============================================
-- Add Transaction Amount Tracking to Subscriptions
-- Created: 2026-02-08
-- Fixes: Discrepancy between DB plan and Paddle transaction amounts
-- ============================================

-- Add columns to track actual transaction amounts from Paddle
ALTER TABLE subscriptions
ADD COLUMN IF NOT EXISTS last_transaction_amount NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS last_transaction_currency TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS last_transaction_date TIMESTAMPTZ;

-- Add index for transaction lookup
CREATE INDEX IF NOT EXISTS idx_subscriptions_transaction_date 
ON subscriptions(last_transaction_date DESC);

-- Add comment for documentation
COMMENT ON COLUMN subscriptions.last_transaction_amount IS 'The actual amount charged in the last completed transaction from Paddle';
COMMENT ON COLUMN subscriptions.last_transaction_currency IS 'Currency of the last transaction (e.g., EUR, USD)';
COMMENT ON COLUMN subscriptions.last_transaction_date IS 'Timestamp of the last completed transaction';
