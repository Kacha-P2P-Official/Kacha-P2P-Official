-- Escrow insurance fund table
CREATE TABLE IF NOT EXISTS escrow_insurance_fund (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  fund_name TEXT NOT NULL DEFAULT 'Kacha P2P Insurance Fund',
  total_balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  available_balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  reserved_balance DECIMAL(20, 8) DEFAULT 0 NOT NULL,
  contribution_rate DECIMAL(5, 4) DEFAULT 0.0050 NOT NULL, -- 0.5% of trade value
  max_coverage_per_trade DECIMAL(20, 8) DEFAULT 1000 NOT NULL, -- Max USDT coverage per trade
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insurance claims table
CREATE TABLE IF NOT EXISTS insurance_claims (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  claim_amount DECIMAL(20, 8) NOT NULL,
  claim_reason TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
  evidence_urls TEXT[] DEFAULT '{}',
  admin_notes TEXT,
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Insurance contributions table
CREATE TABLE IF NOT EXISTS insurance_contributions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  trade_id UUID REFERENCES trades(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(20, 8) NOT NULL,
  contribution_rate DECIMAL(5, 4) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_insurance_claims_trade_id ON insurance_claims(trade_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_user_id ON insurance_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_insurance_claims_status ON insurance_claims(status);
CREATE INDEX IF NOT EXISTS idx_insurance_contributions_trade_id ON insurance_contributions(trade_id);
CREATE INDEX IF NOT EXISTS idx_insurance_contributions_user_id ON insurance_contributions(user_id);

-- RLS policies
ALTER TABLE insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE insurance_contributions ENABLE ROW LEVEL SECURITY;

-- Users can view their own insurance claims
CREATE POLICY "Users can view own insurance claims"
  ON insurance_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all insurance claims
CREATE POLICY "Admins can view all insurance claims"
  ON insurance_claims FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can insert their own insurance claims
CREATE POLICY "Users can insert own insurance claims"
  ON insurance_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can update insurance claims
CREATE POLICY "Admins can update insurance claims"
  ON insurance_claims FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Users can view their own insurance contributions
CREATE POLICY "Users can view own insurance contributions"
  ON insurance_contributions FOR SELECT
  USING (auth.uid() = user_id);

-- Triggers
CREATE TRIGGER update_insurance_claims_updated_at
  BEFORE UPDATE ON insurance_claims
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_escrow_insurance_fund_updated_at
  BEFORE UPDATE ON escrow_insurance_fund
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate insurance contribution for a trade
CREATE OR REPLACE FUNCTION calculate_insurance_contribution(trade_amount DECIMAL)
RETURNS DECIMAL AS $$
DECLARE
  contribution_rate DECIMAL;
  contribution DECIMAL;
BEGIN
  -- Get current contribution rate
  SELECT contribution_rate INTO contribution_rate
  FROM escrow_insurance_fund
  LIMIT 1;

  contribution = trade_amount * contribution_rate;
  RETURN contribution;
END;
$$ LANGUAGE plpgsql;

-- Function to add insurance contribution when a trade is completed
CREATE OR REPLACE FUNCTION add_insurance_contribution()
RETURNS TRIGGER AS $$
DECLARE
  contribution DECIMAL;
  contribution_rate DECIMAL;
BEGIN
  -- Only add contribution for completed trades
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    -- Calculate contribution
    SELECT contribution_rate INTO contribution_rate
    FROM escrow_insurance_fund
    LIMIT 1;

    contribution = NEW.amount_usdt * contribution_rate;

    -- Add contribution record
    INSERT INTO insurance_contributions (trade_id, user_id, amount, contribution_rate)
    VALUES (NEW.id, NEW.buyer_id, contribution / 2, contribution_rate);

    INSERT INTO insurance_contributions (trade_id, user_id, amount, contribution_rate)
    VALUES (NEW.id, NEW.seller_id, contribution / 2, contribution_rate);

    -- Update fund balance
    UPDATE escrow_insurance_fund
    SET total_balance = total_balance + contribution,
        available_balance = available_balance + contribution,
        updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for trade completion
DROP TRIGGER IF EXISTS trade_completed_insurance_trigger ON trades;
CREATE TRIGGER trade_completed_insurance_trigger
  AFTER UPDATE ON trades
  FOR EACH ROW
  EXECUTE FUNCTION add_insurance_contribution();

-- Initialize insurance fund if not exists
INSERT INTO escrow_insurance_fund (fund_name, total_balance, available_balance, reserved_balance)
VALUES ('Kacha P2P Insurance Fund', 0, 0, 0)
ON CONFLICT DO NOTHING;
