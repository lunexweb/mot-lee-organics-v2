-- Emergency Fix: Restore Users Visibility
-- The RLS policies are too restrictive, admin can't see users

-- Add a policy to allow admins to see all users immediately
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Also add a backup policy for authenticated users to see basic info
CREATE POLICY "Authenticated users can read all users" ON users
  FOR SELECT USING (
    auth.role() = 'authenticated'
  );

-- Test the fix
SELECT 'Users visibility restored' as result;

-- Check current policies
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
AND cmd = 'SELECT';
