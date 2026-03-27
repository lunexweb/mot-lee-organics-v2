-- Debug Status Update Issue
-- Check if status column exists and what's preventing updates

-- 1. Check users table structure for status column
SELECT '=== USERS TABLE STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- 2. Check current status values for all users
SELECT '=== CURRENT STATUS VALUES ===' as section;
SELECT id, name, email, status, role, ibo_number 
FROM users 
ORDER BY status, name;

-- 3. Test a direct status update
SELECT '=== TESTING DIRECT STATUS UPDATE ===' as section;
-- Try to update first inactive user to active
UPDATE users 
SET status = 'active' 
WHERE status = 'inactive' 
AND id = (SELECT id FROM users WHERE status = 'inactive' LIMIT 1);

-- Check if the update worked
SELECT '=== AFTER UPDATE CHECK ===' as section;
SELECT id, name, email, status, role, ibo_number 
FROM users 
WHERE status = 'active' 
ORDER BY name;

-- 4. Check RLS policies are working
SELECT '=== CURRENT RLS POLICIES ===' as section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename = 'users';
