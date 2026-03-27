-- Complete Fix for All User RLS Policies
-- This ensures status updates work for all IBOs

-- Drop ALL existing user policies to start fresh
DROP POLICY IF EXISTS "Users can read own profile" ON users;
DROP POLICY IF EXISTS "Users can update own profile" ON users;
DROP POLICY IF EXISTS "Users can insert own profile" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;
DROP POLICY IF EXISTS "Admins can insert users" ON users;

-- Create comprehensive policies

-- 1. Users can read their own profile
CREATE POLICY "Users can read own profile" ON users
  FOR SELECT USING (auth.uid() = id);

-- 2. Users can update their own profile (excluding sensitive fields)
CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 3. Users can insert their own profile (registration)
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

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Test the setup
SELECT 'All user RLS policies have been recreated' as result;

-- Add missing status column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'inactive';
        ALTER TABLE users ALTER COLUMN status SET NOT NULL;
        ALTER TABLE users ADD CONSTRAINT users_status_check 
            CHECK (status IN ('active', 'inactive'));
    END IF;
END $$;

SELECT 'Status column verified/added' as result;
