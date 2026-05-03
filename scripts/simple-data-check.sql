-- Simple Data Check - No Enum Assumptions
-- This will show you the actual enum values in your database

-- =====================================================
-- 1. YOUR USER INFO
-- =====================================================
SELECT '=== YOUR USER INFO ===' as section;
SELECT id, name, ibo_number, email, created_at FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 2. YOUR ORDERS (Raw Status Values)
-- =====================================================
SELECT '=== YOUR ORDERS ===' as section;
SELECT 
  id, 
  order_number, 
  total_amount, 
  status, 
  payment_status, 
  created_at
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 3. YOUR COMMISSIONS
-- =====================================================
SELECT '=== YOUR COMMISSIONS ===' as section;
SELECT 
  id, 
  commission_amount, 
  status, 
  commission_type, 
  level, 
  created_at
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 4. YOUR WALLETS
-- =====================================================
SELECT '=== YOUR WALLETS ===' as section;
SELECT 
  wallet_type, 
  balance, 
  available_for_withdrawal, 
  created_at,
  updated_at
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY wallet_type;

-- =====================================================
-- 5. YOUR BUSINESS VALUE
-- =====================================================
SELECT '=== YOUR BUSINESS VALUE ===' as section;
SELECT 
  level, 
  total_bv,
  created_at,
  updated_at
FROM business_value 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY level;

-- =====================================================
-- 6. YOUR TRANSACTIONS
-- =====================================================
SELECT '=== YOUR TRANSACTIONS ===' as section;
SELECT 
  transaction_type, 
  amount, 
  source_type, 
  source_name, 
  description, 
  status,
  wallet_type,
  created_at
FROM transactions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 7. SYSTEM OVERVIEW
-- =====================================================
SELECT '=== SYSTEM OVERVIEW ===' as section;
SELECT 
  'Total Orders' as metric,
  COUNT(*)::text as value
FROM orders
UNION ALL
SELECT 
  'Total Commissions' as metric,
  COUNT(*)::text as value
FROM commissions
UNION ALL
SELECT 
  'Users with Wallets' as metric,
  COUNT(DISTINCT user_id)::text as value
FROM wallets
UNION ALL
SELECT 
  'Total Transactions' as metric,
  COUNT(*)::text as value
FROM transactions
UNION ALL
SELECT 
  'Total Business Value Records' as metric,
  COUNT(*)::text as value
FROM business_value;

-- =====================================================
-- 8. YOUR INCOME BREAKDOWN
-- =====================================================
SELECT '=== YOUR INCOME BREAKDOWN ===' as section;
SELECT 
  referral_income,
  repurchase_income,
  maintenance_income,
  rank_bonus_income,
  salary_income,
  total_income
FROM income_breakdown 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

SELECT '=== DATA CHECK COMPLETE ===' as final_section;
