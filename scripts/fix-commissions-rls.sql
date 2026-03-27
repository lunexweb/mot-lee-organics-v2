-- ===================================================================
-- FIX ROW-LEVEL SECURITY POLICIES FOR COMMISSIONS TABLE
-- ===================================================================
-- This script fixes the error: "new row violates row-level security policy for table 'commissions'"
-- It allows database triggers/functions to automatically create commissions when orders are placed
--
-- IMPORTANT: Run this in your Supabase SQL Editor
-- ===================================================================

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view their own commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can view all commissions" ON commissions;
DROP POLICY IF EXISTS "Service role can insert commissions" ON commissions;
DROP POLICY IF EXISTS "Users can insert their own commissions" ON commissions;
DROP POLICY IF EXISTS "Admins can update all commissions" ON commissions;
DROP POLICY IF EXISTS "Allow commission inserts for authenticated users" ON commissions;
DROP POLICY IF EXISTS "Allow system to insert commissions" ON commissions;

-- Step 2: Enable RLS on commissions table (if not already enabled)
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Step 3: Grant necessary permissions for inserts
-- This is CRITICAL - allows database triggers/functions to create commissions
-- The trigger runs in the context of the authenticated user who created the order
GRANT INSERT ON commissions TO authenticated;
GRANT INSERT ON commissions TO service_role;
GRANT SELECT ON commissions TO authenticated;
GRANT UPDATE ON commissions TO authenticated;

-- ===================================================================
-- Step 4: Create RLS Policies
-- ===================================================================

-- Policy 1: Users can view their own commissions
CREATE POLICY "Users can view their own commissions"
  ON commissions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Admins can view all commissions
CREATE POLICY "Admins can view all commissions"
  ON commissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Policy 3: Allow authenticated users to insert commissions
-- This allows database triggers that run when orders are created
-- The trigger executes in the context of the authenticated user
CREATE POLICY "Allow commission inserts for authenticated users"
  ON commissions
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy 4: Allow service_role to insert commissions
-- This covers cases where triggers run with service_role privileges
CREATE POLICY "Allow system to insert commissions"
  ON commissions
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Policy 5: Admins can update all commissions (for paying commissions)
CREATE POLICY "Admins can update all commissions"
  ON commissions
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- ===================================================================
-- Verification (optional - run these to verify)
-- ===================================================================
-- Check that RLS is enabled:
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'commissions';

-- List all policies on commissions table:
-- SELECT policyname, cmd, roles, qual FROM pg_policies WHERE tablename = 'commissions';

-- ===================================================================
-- IMPORTANT NOTES:
-- ===================================================================
-- 1. If you have a database trigger that creates commissions after order insertion,
--    it will now work because:
--    - The GRANT statements allow the INSERT operation
--    - The INSERT policies allow authenticated users and service_role to insert
-- 
-- 2. If commissions are still not being created after running this script:
--    - Check your trigger/function code
--    - Verify the trigger is set to fire AFTER INSERT on orders
--    - Ensure the trigger uses SECURITY DEFINER or runs with appropriate role
--
-- 3. Test by creating an order and verifying commissions are created without errors
--
-- 4. If you need to manually create commissions (for testing):
--    - Make sure you're authenticated as a user
--    - The INSERT policy will allow it
-- ===================================================================

