-- Add sponsor_number column to users table
-- Run this in your Supabase SQL editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS sponsor_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_sponsor_number ON public.users(sponsor_number);

-- Update existing users to have sponsor numbers (if they don't have one)
-- This generates unique sponsor numbers for existing users
UPDATE public.users
SET sponsor_number = 'SP-' || UPPER(SUBSTR(MD5(id::text || created_at::text), 1, 6))
WHERE sponsor_number IS NULL;

