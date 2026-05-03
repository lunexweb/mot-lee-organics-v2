-- Fix Missing User Profile - Complete Version
-- Run this in Supabase SQL Editor to create the missing user profile with all required fields

-- First, let's check if the user exists in auth.users but not in public.users
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as profile_id,
  pu.email as profile_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id = '2dd60e9d-1221-4ba1-aa51-f689d581785c';

-- Create the missing user profile with all required fields
INSERT INTO public.users (
  id,
  email,
  name,
  ibo_number,
  sponsor_number,
  admin_number,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  '2dd60e9d-1221-4ba1-aa51-f689d581785c',
  (SELECT email FROM auth.users WHERE id = '2dd60e9d-1221-4ba1-aa51-f689d581785c'),
  'Default Name',
  'IBO' || EXTRACT(EPOCH FROM NOW())::bigint,  -- Generate unique IBO number
  NULL,  -- sponsor_number can be null
  NULL,  -- admin_number can be null
  'distributor',
  'active',
  NOW(),
  NOW()
);

-- Verify the profile was created
SELECT * FROM public.users WHERE id = '2dd60e9d-1221-4ba1-aa51-f689d581785c';

SELECT 'User profile created successfully!' as result;
