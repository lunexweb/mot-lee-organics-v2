-- FIND THE REAL DATABASE ISSUE
-- Check why queries return empty when Herry has data

-- =====================================================
-- 1. CHECK IF TABLES ACTUALLY EXIST
-- =====================================================
SELECT '=== TABLE EXISTENCE CHECK ===' as section;
SELECT 
  'orders' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'orders') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'commissions' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'commissions') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'wallets' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wallets') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'transactions' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transactions') THEN 'EXISTS' ELSE 'MISSING' END as status
UNION ALL
SELECT 
  'business_value' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_value') THEN 'EXISTS' ELSE 'MISSING' END as status;

-- =====================================================
-- 2. CHECK ROW COUNTS IN ALL TABLES
-- =====================================================
SELECT '=== ROW COUNTS IN ALL TABLES ===' as section;
SELECT 
  'orders' as table_name,
  COALESCE(COUNT(*), 0) as row_count
FROM orders
UNION ALL
SELECT 
  'commissions' as table_name,
  COALESCE(COUNT(*), 0) as row_count
FROM commissions
UNION ALL
SELECT 
  'wallets' as table_name,
  COALESCE(COUNT(*), 0) as row_count
FROM wallets
UNION ALL
SELECT 
  'transactions' as table_name,
  COALESCE(COUNT(*), 0) as row_count
FROM transactions
UNION ALL
SELECT 
  'business_value' as table_name,
  COALESCE(COUNT(*), 0) as row_count
FROM business_value;

-- =====================================================
-- 3. CHECK HERRY'S USER ID MATCH
-- =====================================================
SELECT '=== HERRY USER ID VERIFICATION ===' as section;
SELECT 
  'Herry User ID' as item,
  id as value,
  'Used in all queries' as notes
FROM users 
WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 4. CHECK IF HERRY'S DATA EXISTS IN DIFFERENT TABLES
-- =====================================================
SELECT '=== SEARCH FOR HERRY''S DATA EVERYWHERE ===' as section;
SELECT 
  'orders table' as location,
  COUNT(*) as record_count
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
UNION ALL
SELECT 
  'commissions table' as location,
  COUNT(*) as record_count
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
UNION ALL
SELECT 
  'wallets table' as location,
  COUNT(*) as record_count
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 5. CHECK RLS POLICY STATUS
-- =====================================================
SELECT '=== RLS POLICY STATUS ===' as section;
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN 'RLS Active - May Block Access'
    ELSE 'RLS Disabled - Full Access'
  END as status
FROM pg_tables 
WHERE schemaname = 'public' AND tablename IN ('orders', 'commissions', 'wallets', 'transactions', 'business_value')
ORDER BY tablename;

-- =====================================================
-- 6. TEST DIRECT ACCESS WITHOUT USER_ID FILTER
-- =====================================================
SELECT '=== DIRECT TABLE ACCESS TEST ===' as section;
SELECT 
  'Total orders in system' as test,
  COUNT(*) as result
FROM orders
UNION ALL
SELECT 
  'Total commissions in system' as test,
  COUNT(*) as result
FROM commissions
UNION ALL
SELECT 
  'Total wallets in system' as test,
  COUNT(*) as result
FROM wallets;

SELECT '=== DATABASE ISSUE DIAGNOSIS COMPLETE ===' as final_section;
