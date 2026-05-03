-- Add admin_number column to users table
-- Run this in your Supabase SQL editor

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS admin_number TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_admin_number ON public.users(admin_number);

-- Generate unique admin number for beauty@motleeorganics.com (the admin)
-- This will create an admin number like ADM-XXXXXX
UPDATE public.users
SET admin_number = 'ADM-' || UPPER(SUBSTR(MD5(email || created_at::text), 1, 6))
WHERE email = 'beauty@motleeorganics.com' AND admin_number IS NULL;

-- If you need to manually set a specific admin number, use:
-- UPDATE public.users
-- SET admin_number = 'ADM-XXXXXX'  -- Replace XXXXXX with your desired code
-- WHERE email = 'beauty@motleeorganics.com';

