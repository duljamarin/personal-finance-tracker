-- Migration: Net Worth Tracking
-- Description: Creates assets and net_worth_snapshots tables for net worth tracking

-- Assets table
CREATE TABLE IF NOT EXISTS public.assets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('asset', 'liability')),
  asset_type text NOT NULL DEFAULT 'other',
  current_value numeric(15, 2) NOT NULL DEFAULT 0 CHECK (current_value >= 0),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Net worth snapshots table (monthly history)
CREATE TABLE IF NOT EXISTS public.net_worth_snapshots (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_date date NOT NULL DEFAULT CURRENT_DATE,
  total_assets numeric(15, 2) NOT NULL DEFAULT 0,
  total_liabilities numeric(15, 2) NOT NULL DEFAULT 0,
  net_worth numeric(15, 2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, snapshot_date)
);

-- Enable RLS
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.net_worth_snapshots ENABLE ROW LEVEL SECURITY;

-- RLS policies for assets
CREATE POLICY "Users can manage their own assets"
  ON public.assets
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS policies for net_worth_snapshots
CREATE POLICY "Users can manage their own net worth snapshots"
  ON public.net_worth_snapshots
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_assets_user_id ON public.assets(user_id);
CREATE INDEX IF NOT EXISTS idx_net_worth_snapshots_user_id_date ON public.net_worth_snapshots(user_id, snapshot_date DESC);

-- updated_at trigger for assets
CREATE OR REPLACE FUNCTION update_assets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW
  EXECUTE FUNCTION update_assets_updated_at();

-- Function to upsert today's net worth snapshot (called via RPC)
CREATE OR REPLACE FUNCTION upsert_net_worth_snapshot(p_user_id uuid)
RETURNS void AS $$
DECLARE
  v_total_assets numeric;
  v_total_liabilities numeric;
BEGIN
  SELECT COALESCE(SUM(current_value), 0) INTO v_total_assets
  FROM public.assets
  WHERE user_id = p_user_id AND type = 'asset';

  SELECT COALESCE(SUM(current_value), 0) INTO v_total_liabilities
  FROM public.assets
  WHERE user_id = p_user_id AND type = 'liability';

  INSERT INTO public.net_worth_snapshots (user_id, snapshot_date, total_assets, total_liabilities, net_worth)
  VALUES (p_user_id, CURRENT_DATE, v_total_assets, v_total_liabilities, v_total_assets - v_total_liabilities)
  ON CONFLICT (user_id, snapshot_date)
  DO UPDATE SET
    total_assets = EXCLUDED.total_assets,
    total_liabilities = EXCLUDED.total_liabilities,
    net_worth = EXCLUDED.net_worth;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
