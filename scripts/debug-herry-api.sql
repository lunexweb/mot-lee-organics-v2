-- DEBUG EXACT DASHBOARD API CALLS
-- Test the exact queries the dashboard is making for Herry

-- Get Herry's user ID first
SELECT '=== HERRY USER ID ===' as section;
SELECT id as user_id FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- Test 1: fetchDashboardStats - Personal Orders
SELECT '=== TEST 1: PERSONAL ORDERS QUERY ===' as section;
SELECT COUNT(*) as personal_sales
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 2: fetchDashboardStats - Downline Count
SELECT '=== TEST 2: DOWNLINE COUNT QUERY ===' as section;
SELECT COUNT(*) as downline_count
FROM users 
WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 3: fetchDashboardStats - Commissions
SELECT '=== TEST 3: COMMISSIONS QUERY ===' as section;
SELECT SUM(commission_amount) as total_earnings
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR') AND status = 'paid';

-- Test 4: fetchWalletData
SELECT '=== TEST 4: WALLETS QUERY ===' as section;
SELECT wallet_type, balance, available_for_withdrawal
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 5: fetchIncomeBreakdown
SELECT '=== TEST 5: INCOME BREAKDOWN QUERY ===' as section;
SELECT *
FROM income_breakdown 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 6: fetchBusinessValue
SELECT '=== TEST 6: BUSINESS VALUE QUERY ===' as section;
SELECT level, total_bv
FROM business_value 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY level;

-- Test 7: fetchRecentTransactions
SELECT '=== TEST 7: TRANSACTIONS QUERY ===' as section;
SELECT COUNT(*) as transaction_count
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- Test 8: fetchRecentOrders
SELECT '=== TEST 8: RECENT ORDERS QUERY ===' as section;
SELECT COUNT(*) as recent_orders_count
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

SELECT '=== API DEBUGGING COMPLETE ===' as final_section;
SELECT 'If these return data but dashboard shows zeros, the issue is in React state management' as analysis;
