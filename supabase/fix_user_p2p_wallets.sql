-- Create user_p2p_wallets table
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_user_id ON public.user_p2p_wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_wallet_type ON public.user_p2p_wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_user_p2p_wallets_is_active ON public.user_p2p_wallets(is_active);

-- Enable Row Level Security
ALTER TABLE public.user_p2p_wallets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Users can insert their own wallets
CREATE POLICY "Users can insert own P2P wallets"
  ON public.user_p2p_wallets FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can insert wallets
CREATE POLICY "Admins can insert P2P wallets"
  ON public.user_p2p_wallets FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can update their own wallets
CREATE POLICY "Users can update own P2P wallets"
  ON public.user_p2p_wallets FOR UPDATE
  USING (auth.uid() = user_id);

-- Admins can update wallets
CREATE POLICY "Admins can update P2P wallets"
  ON public.user_p2p_wallets FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users can delete their own wallets
CREATE POLICY "Users can delete own P2P wallets"
  ON public.user_p2p_wallets FOR DELETE
  USING (auth.uid() = user_id);

-- Admins can delete wallets
CREATE POLICY "Admins can delete P2P wallets"
  ON public.user_p2p_wallets FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_p2p_wallets_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER user_p2p_wallets_updated_at
  BEFORE UPDATE ON public.user_p2p_wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_user_p2p_wallets_updated_at();