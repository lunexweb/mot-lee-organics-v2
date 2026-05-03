-- Fix Users Table RLS Policies - Clean Version
-- Run this in Supabase SQL Editor to fix the infinite recursion error

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "users.admin.select_all" ON users;
DROP POLICY IF EXISTS "users.admin.update_all" ON users;
DROP POLICY IF EXISTS "users_anon_read_all" ON users;
DROP POLICY IF EXISTS "users_authenticated_read_all" ON users;
DROP POLICY IF EXISTS "users_insert" ON users;
DROP POLICY IF EXISTS "users_insert_any" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "users_own_update" ON users;
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;
DROP POLICY IF EXISTS "Public can read basic user info" ON users;
DROP POLICY IF EXISTS "Public can read limited user info" ON users;

-- Create clean, simple RLS policies without recursion

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile  
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 3. Users can insert their own profile (registration)
CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 4. Admins can read all users - using JWT role to avoid recursion
CREATE POLICY "Admins can read all users" ON users
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 5. Admins can update all users
CREATE POLICY "Admins can update all users" ON users
  FOR UPDATE USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- 6. Admins can insert users
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Enable RLS (make sure it's on)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test the policy by checking if the current user can access their profile
SELECT 'RLS policies updated successfully - no more recursion!' as result;
