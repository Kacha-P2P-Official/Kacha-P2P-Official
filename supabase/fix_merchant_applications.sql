-- Create merchant_applications table
CREATE TABLE IF NOT EXISTS public.merchant_applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  business_name TEXT NOT NULL,
  business_description TEXT,
  trading_volume_usdt NUMERIC NOT NULL DEFAULT 0,
  preferred_payment_methods TEXT[] NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_merchant_applications_user_id ON public.merchant_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_applications_status ON public.merchant_applications(status);

-- Enable Row Level Security
ALTER TABLE public.merchant_applications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can view their own applications
CREATE POLICY "Users can view own merchant applications"
  ON public.merchant_applications FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own applications
CREATE POLICY "Users can insert own merchant applications"
  ON public.merchant_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all applications
CREATE POLICY "Admins can view all merchant applications"
  ON public.merchant_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can update applications (approve/reject)
CREATE POLICY "Admins can update merchant applications"
  ON public.merchant_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create a function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_merchant_applications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER merchant_applications_updated_at
  BEFORE UPDATE ON public.merchant_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_merchant_applications_updated_at();