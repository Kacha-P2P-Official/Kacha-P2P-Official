-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Admins can view all P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Users can insert own P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Admins can insert P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Users can update own P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Admins can update P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Users can delete own P2P wallets" ON public.user_p2p_wallets;
DROP POLICY IF EXISTS "Admins can delete P2P wallets" ON public.user_p2p_wallets;

-- Create table if not exists
CREATE TABLE IF NOT EXISTS public.user_p2p_wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  wallet_address TEXT NOT NULL,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('trc20', 'erc20', 'bep20', 'native')),
  network TEXT NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes if not exists
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_user_id ON public.user_p2p_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_wallet_type ON public.user_p2p_wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_is_active ON public.user_p2p_wallets(is_active);

-- Enable Row Level Security
ALTER TABLE public.user_p2p_wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (admin-only for insert/update/delete)
-- Users can view their own wallets
CREATE POLICY "Users can view own P2P wallets"
  ON public.user_p2p_wallets FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all wallets
CREATE POLICY "Admins can view all P2P wallets"
  ON public.user_p2p_wallets FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can insert wallets
CREATE POLICY "Admins can insert P2P wallets"
  ON public.user_p2p_wallets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can update wallets
CREATE POLICY "Admins can update P2P wallets"
  ON public.user_p2p_wallets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete wallets
CREATE POLICY "Admins can delete P2P wallets"
  ON public.user_p2p_wallets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_user_p2p_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS user_p2p_wallets_updated_at ON public.user_p2p_wallets;

CREATE TRIGGER user_p2p_wallets_updated_at
  BEFORE UPDATE ON public.user_p2p_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_p2p_wallets_updated_at();