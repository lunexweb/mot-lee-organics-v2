-- Emergency: Disable RLS temporarily to restore users visibility
-- This will immediately make all users visible again

-- Disable RLS on users table
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT 'RLS disabled - all users should now be visible' as result;

-- Check table status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';
