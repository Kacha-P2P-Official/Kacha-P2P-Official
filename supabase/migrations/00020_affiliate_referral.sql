-- Referrals table
CREATE TABLE IF NOT EXISTS referrals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  referred_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  referral_code TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  completed_at TIMESTAMP WITH TIME ZONE,
  bonus_amount DECIMAL(20, 8) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Referral codes table
CREATE TABLE IF NOT EXISTS referral_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  total_earnings DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  total_referrals INTEGER DEFAULT 0 NOT NULL,
  active_referrals INTEGER DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Affiliate earnings table
CREATE TABLE IF NOT EXISTS affiliate_earnings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_id UUID REFERENCES referrals(id) ON DELETE CASCADE NOT NULL,
  referrer_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  commission_rate DECIMAL(5, 4) NOT NULL,
  commission_amount DECIMAL(20, 8) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'available', 'paid')),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Affiliate settings
CREATE TABLE IF NOT EXISTS affiliate_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  commission_rate DECIMAL(5, 4) DEFAULT 0.0100 NOT NULL, -- 1% commission
  bonus_per_referral DECIMAL(20, 8) DEFAULT 5 NOT NULL, -- 5 USDT bonus per referral
  minimum_payout DECIMAL(20, 8) DEFAULT 20 NOT NULL, -- Minimum 20 USDT to withdraw
  max_commission_per_trade DECIMAL(20, 8) DEFAULT 10 NOT NULL, -- Max 10 USDT per trade
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);
CREATE INDEX IF NOT EXISTS idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_referral_codes_code ON referral_codes(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_referrer_id ON affiliate_earnings(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_referral_id ON affiliate_earnings(referral_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_earnings_status ON affiliate_earnings(status);

-- RLS policies
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_earnings ENABLE ROW LEVEL SECURITY;

-- Users can view their own referrals
CREATE POLICY "Users can view own referrals"
  ON referrals FOR SELECT
  USING (auth.uid() = referrer_id);

-- Users can view their own referral codes
CREATE POLICY "Users can view own referral codes"
  ON referral_codes FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own referral codes
CREATE POLICY "Users can insert own referral codes"
  ON referral_codes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own referral codes
CREATE POLICY "Users can update own referral codes"
  ON referral_codes FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can view their own affiliate earnings
CREATE POLICY "Users can view own affiliate earnings"
  ON affiliate_earnings FOR SELECT
  USING (auth.uid() = referrer_id);

-- Admins can view all tables
CREATE POLICY "Admins can view all referrals"
  ON referrals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all referral codes"
  ON referral_codes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can view all affiliate earnings"
  ON affiliate_earnings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

CREATE POLICY "Admins can update affiliate earnings"
  ON affiliate_earnings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Triggers
CREATE TRIGGER update_referral_codes_updated_at
  BEFORE UPDATE ON referral_codes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_affiliate_settings_updated_at
  BEFORE UPDATE ON affiliate_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text), 1, 8));
    SELECT EXISTS(SELECT 1 FROM referral_codes WHERE code = code) INTO exists;
    IF NOT exists THEN
      RETURN code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Function to create referral code for new user
CREATE OR REPLACE FUNCTION create_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := generate_referral_code();
  
  INSERT INTO referral_codes (user_id, code)
  VALUES (user_id_param, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Function to process referral on trade completion
CREATE OR REPLACE FUNCTION process_referral_commission()
RETURNS TRIGGER AS $$
DECLARE
  referral_record RECORD;
  settings RECORD;
  commission_amount DECIMAL;
BEGIN
  -- Only process for completed trades
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Get affiliate settings
    SELECT * INTO settings FROM affiliate_settings LIMIT 1;
    
    -- Check if buyer was referred
    SELECT * INTO referral_record
    FROM referrals
    WHERE referred_id = NEW.buyer_id
    AND status = 'completed';
    
    IF referral_record.id IS NOT NULL THEN
      -- Calculate commission
      commission_amount = LEAST(
        NEW.amount_usdt * settings.commission_rate,
        settings.max_commission_per_trade
      );
      
      -- Create affiliate earning record
      INSERT INTO affiliate_earnings (
        referral_id,
        referrer_id,
        trade_id,
        commission_rate,
        commission_amount,
        status
      ) VALUES (
        referral_record.id,
        referral_record.referrer_id,
        NEW.id,
        settings.commission_rate,
        commission_amount,
        'available'
      );
      
      -- Update referral code stats
      UPDATE referral_codes
      SET total_earnings = total_earnings + commission_amount,
          updated_at = NOW()
      WHERE user_id = referral_record.referrer_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade completion
DROP TRIGGER IF EXISTS trade_referral_commission_trigger ON trades;
CREATE TRIGGER trade_referral_commission_trigger
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION process_referral_commission();

-- Initialize affiliate settings
INSERT INTO affiliate_settings (commission_rate, bonus_per_referral, minimum_payout, max_commission_per_trade)
VALUES (0.0100, 5, 20, 10)
ON CONFLICT DO NOTHING;
