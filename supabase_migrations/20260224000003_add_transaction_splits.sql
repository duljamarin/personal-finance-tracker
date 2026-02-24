-- Migration: Transaction Splits
-- Description: Allows splitting a single transaction across multiple categories

CREATE TABLE IF NOT EXISTS public.transaction_splits (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  percentage numeric(8, 4),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.transaction_splits ENABLE ROW LEVEL SECURITY;

-- RLS policy
CREATE POLICY "Users can manage their own transaction splits"
  ON public.transaction_splits
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_transaction_splits_transaction_id ON public.transaction_splits(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_splits_user_id ON public.transaction_splits(user_id);

-- Add has_splits flag to transactions for quick filtering
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS has_splits boolean DEFAULT false;
