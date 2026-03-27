-- Show All Users Immediately
-- Simple fix to restore user visibility

-- Disable RLS temporarily to show all users
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- Verify all users are visible
SELECT '=== ALL USERS (RLS DISABLED) ===' as section;
SELECT id, name, email, status, role, ibo_number 
FROM users 
ORDER BY status, name;

-- Show RLS status
SELECT 'RLS Status:' as info, schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'users' 
AND schemaname = 'public';
