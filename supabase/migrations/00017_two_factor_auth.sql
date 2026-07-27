-- Two-factor authentication table
CREATE TABLE IF NOT EXISTS two_factor_auth (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  secret TEXT NOT NULL,
  backup_codes TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN DEFAULT FALSE NOT NULL,
  verified BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_two_factor_auth_user_id ON two_factor_auth(user_id);

-- RLS policies
ALTER TABLE two_factor_auth ENABLE ROW LEVEL SECURITY;

-- Users can view their own 2FA settings
CREATE POLICY "Users can view own 2FA"
  ON two_factor_auth FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own 2FA settings
CREATE POLICY "Users can insert own 2FA"
  ON two_factor_auth FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own 2FA settings
CREATE POLICY "Users can update own 2FA"
  ON two_factor_auth FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own 2FA settings
CREATE POLICY "Users can delete own 2FA"
  ON two_factor_auth FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
