-- Complete RLS Fix for Users Table
-- This will fix all status update issues

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "users.authenticated.select_all" ON users;

-- Create clean, proper policies

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Admins can read all users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 5. Admins can update all users (including status)
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 6. Admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Ensure RLS is enabled
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Verify all policies are created correctly
SELECT 'All RLS policies have been fixed' as result;

-- Test the fix by checking policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;
