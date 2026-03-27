-- Debug API Calls - Test Each Query Used by Dashboard
-- This will test the exact queries your dashboard is making

-- First, get your user ID
SELECT '=== GET USER ID FOR API TESTS ===' as section;
SELECT id as user_id FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- Test 1: Dashboard Stats Query
SELECT '=== TEST 1: DASHBOARD STATS QUERY ===' as section;
-- This is what fetchDashboardStats() calls
SELECT 
  (SELECT COUNT(*) FROM orders WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')) as personal_sales,
  (SELECT COUNT(*) FROM users WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')) as downline_count,
  (SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR') AND status = 'paid') as total_earnings;

-- Test 2: Wallet Data Query  
SELECT '=== TEST 2: WALLET DATA QUERY ===' as section;
-- This is what fetchWalletData() calls
SELECT *
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 3: Income Breakdown Query
SELECT '=== TEST 3: INCOME BREAKDOWN QUERY ===' as section;
-- This is what fetchIncomeBreakdown() calls
SELECT *
FROM income_breakdown 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 4: Business Value Query
SELECT '=== TEST 4: BUSINESS VALUE QUERY ===' as section;
-- This is what fetchBusinessValue() calls
SELECT level, total_bv
FROM business_value 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY level;

-- Test 5: Recent Transactions Query
SELECT '=== TEST 5: RECENT TRANSACTIONS QUERY ===' as section;
-- This is what fetchRecentTransactions() calls
SELECT *
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 10;

-- Test 6: Recent Orders Query
SELECT '=== TEST 6: RECENT ORDERS QUERY ===' as section;
-- This is what fetchRecentOrders() calls
SELECT *
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 5;

-- Test 7: Check RLS Policies
SELECT '=== TEST 7: RLS POLICY CHECK ===' as section;
-- Check if you can access your own data
SELECT 
  'wallets' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM wallets WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR') LIMIT 1)
    THEN '✅ Accessible'
    ELSE '❌ Not Accessible'
  END as access_status
UNION ALL
SELECT 
  'income_breakdown' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM income_breakdown WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR') LIMIT 1)
    THEN '✅ Accessible'
    ELSE '❌ Not Accessible'
  END as access_status
UNION ALL
SELECT 
  'transactions' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM transactions WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR') LIMIT 1)
    THEN '✅ Accessible'
    ELSE '❌ Not Accessible'
  END as access_status;

SELECT '=== API DEBUGGING COMPLETE ===' as final_section;
SELECT 'If these queries return data but dashboard shows zeros, the issue is in the frontend' as analysis;
