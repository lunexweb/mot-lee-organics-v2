-- Check Actual Database Structure
-- This will show us what tables and columns really exist

-- =====================================================
-- 1. CHECK ALL TABLES IN DATABASE
-- =====================================================
SELECT '=== ALL TABLES IN DATABASE ===' as section;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =====================================================
-- 2. CHECK USERS TABLE STRUCTURE
-- =====================================================
SELECT '=== USERS TABLE STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. CHECK YOUR ACTUAL USER RECORD
-- =====================================================
SELECT '=== YOUR USER RECORD (ALL COLUMNS) ===' as section;
SELECT * FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 4. CHECK IF ORDERS TABLE EXISTS AND STRUCTURE
-- =====================================================
SELECT '=== ORDERS TABLE STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'orders' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 5. CHECK IF COMMISSIONS TABLE EXISTS
-- =====================================================
SELECT '=== COMMISSIONS TABLE STRUCTURE ===' as section;
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'commissions' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 6. CHECK ALL YOUR ORDERS (IF TABLE EXISTS)
-- =====================================================
SELECT '=== ALL YOUR ORDERS (IF EXISTS) ===' as section;
SELECT 'Checking if orders table has data...' as status;
SELECT COUNT(*) as order_count FROM orders;

-- =====================================================
-- 7. CHECK ALL YOUR COMMISSIONS (IF TABLE EXISTS)
-- =====================================================
SELECT '=== ALL YOUR COMMISSIONS (IF EXISTS) ===' as section;
SELECT 'Checking if commissions table has data...' as status;
SELECT COUNT(*) as commission_count FROM commissions;

-- =====================================================
-- 8. CHECK RLS STATUS
-- =====================================================
SELECT '=== RLS POLICY STATUS ===' as section;
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('users', 'orders', 'commissions', 'wallets', 'transactions', 'business_value')
ORDER BY tablename;

SELECT '=== DATABASE STRUCTURE CHECK COMPLETE ===' as final_section;
