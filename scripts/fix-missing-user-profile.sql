-- Fix Missing User Profile - Copy and Paste This
-- Run this in Supabase SQL Editor to create the missing user profile

-- First, let's check if the user exists in auth.users but not in public.users
SELECT 
  au.id as auth_id,
  au.email as auth_email,
  pu.id as profile_id,
  pu.email as profile_email
FROM auth.users au
LEFT JOIN public.users pu ON au.id = pu.id
WHERE au.id = '2dd60e9d-1221-4ba1-aa51-f689d581785c';

-- If the above shows the user exists in auth but not in public, run this:
INSERT INTO public.users (
  id,
  email,
  name,
  role,
  status,
  created_at,
  updated_at
) VALUES (
  '2dd60e9d-1221-4ba1-aa51-f689d581785c',
  (SELECT email FROM auth.users WHERE id = '2dd60e9d-1221-4ba1-aa51-f689d581785c'),
  'Default Name',
  'distributor',
  'active',
  NOW(),
  NOW()
);

-- Verify the profile was created
SELECT * FROM public.users WHERE id = '2dd60e9d-1221-4ba1-aa51-f689d581785c';

SELECT 'User profile created successfully!' as result;
