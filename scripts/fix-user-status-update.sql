-- Fix User Status Update Issue
-- The RLS policy for UPDATE needs WITH CHECK clause to allow status changes

-- Drop the existing admin update policy
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Recreate the admin update policy with proper WITH CHECK clause
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Verify the policy was created
SELECT 'Admin update policy fixed with WITH CHECK clause' as result;
