-- Fix Users Table RLS Policies - Copy and Paste This Single Query
-- Run this in Supabase SQL Editor to fix the infinite recursion error

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

CREATE POLICY "Users can read own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Admins can read all users" ON users FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can update all users" ON users FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');
CREATE POLICY "Admins can insert users" ON users FOR INSERT WITH CHECK (auth.jwt() ->> 'role' = 'admin');

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

SELECT 'RLS policies fixed - no more recursion!' as result;
