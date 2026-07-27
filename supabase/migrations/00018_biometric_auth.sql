-- Biometric authentication credentials table
CREATE TABLE IF NOT EXISTS biometric_credentials (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT UNIQUE NOT NULL,
  public_key TEXT NOT NULL,
  counter INTEGER DEFAULT 0 NOT NULL,
  device_type TEXT,
  device_name TEXT,
  last_used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Index
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_user_id ON biometric_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_biometric_credentials_credential_id ON biometric_credentials(credential_id);

-- RLS policies
ALTER TABLE biometric_credentials ENABLE ROW LEVEL SECURITY;

-- Users can view their own biometric credentials
CREATE POLICY "Users can view own biometric credentials"
  ON biometric_credentials FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own biometric credentials
CREATE POLICY "Users can insert own biometric credentials"
  ON biometric_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own biometric credentials
CREATE POLICY "Users can update own biometric credentials"
  ON biometric_credentials FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own biometric credentials
CREATE POLICY "Users can delete own biometric credentials"
  ON biometric_credentials FOR DELETE
  USING (auth.uid() = user_id);
