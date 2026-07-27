-- Add missing payment_details column to offers table
ALTER TABLE public.offers
ADD COLUMN IF NOT EXISTS payment_details jsonb NOT NULL DEFAULT '{}'::jsonb;