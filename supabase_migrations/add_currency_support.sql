-- Add currency support to transactions table
-- Add new columns for multi-currency support
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'EUR',
ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC(10, 6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS base_amount NUMERIC(12, 2);

-- Update existing rows: Convert USD amounts to EUR
-- Assuming existing data was in USD (old base currency)
-- Using approximate USD to EUR conversion rate of 0.92
UPDATE transactions 
SET amount = amount * 0.92,
    base_amount = amount * 0.92,
    currency_code = 'EUR',
    exchange_rate = 0.92
WHERE base_amount IS NULL AND currency_code IS NULL;

-- For any rows that already have base_amount but no currency_code, assume USD and convert
UPDATE transactions 
SET amount = amount * 0.92,
    base_amount = base_amount * 0.92,
    currency_code = 'EUR',
    exchange_rate = 0.92
WHERE base_amount IS NOT NULL AND currency_code IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_transactions_currency_code ON transactions(currency_code);

-- Add check constraint to ensure exchange_rate is positive
ALTER TABLE transactions 
ADD CONSTRAINT check_exchange_rate_positive CHECK (exchange_rate > 0);

-- Comments for documentation
COMMENT ON COLUMN transactions.currency_code IS 'ISO 4217 currency code (e.g., EUR, USD, ALL)';
COMMENT ON COLUMN transactions.exchange_rate IS 'Exchange rate to EUR (base currency) at time of transaction';
COMMENT ON COLUMN transactions.base_amount IS 'Amount normalized to EUR (base currency) for aggregation';
