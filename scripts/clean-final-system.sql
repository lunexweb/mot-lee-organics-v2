-- Clean Final System Implementation
-- Drops existing policies and creates the correct ones

-- Drop all existing policies first
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Authenticated users can read all users" ON users;

-- Verify current status
SELECT '=== CURRENT USER STATUSES ===' as section;
SELECT id, name, email, status, role, ibo_number 
FROM users 
ORDER BY status, name;

-- Create proper RLS policies that work

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Admins can read all users
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 3. Admins can update all users (including status)
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 4. Users can update their own profile (but not status)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND 
    status IS NOT DISTINCT FROM (SELECT status FROM users WHERE id = auth.uid())
  );

-- 5. Users can insert their own profile
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test the setup
SELECT 'Final status system implemented' as result;

-- Check all policies are correct
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users' 
ORDER BY cmd, policyname;
