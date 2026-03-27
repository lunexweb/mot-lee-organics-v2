-- COMPLETE HERRY MASWANGANY PROFILE CHECK
-- Everything about user IBO-N8P5RAKR in one query

-- =====================================================
-- 1. HERRY'S USER PROFILE
-- =====================================================
SELECT '=== HERRY MASWANGANY USER PROFILE ===' as section;
SELECT * FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 2. HERRY'S ORDERS
-- =====================================================
SELECT '=== HERRY''S ORDERS ===' as section;
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
-- 3. HERRY'S COMMISSIONS
-- =====================================================
SELECT '=== HERRY''S COMMISSIONS ===' as section;
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
-- 4. HERRY'S WALLETS
-- =====================================================
SELECT '=== HERRY''S WALLETS ===' as section;
SELECT 
  wallet_type,
  balance,
  available_for_withdrawal,
  created_at,
  updated_at
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 5. HERRY'S BUSINESS VALUE
-- =====================================================
SELECT '=== HERRY''S BUSINESS VALUE ===' as section;
SELECT 
  level,
  total_bv,
  created_at,
  updated_at
FROM business_value 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY level;

-- =====================================================
-- 6. HERRY'S TRANSACTIONS
-- =====================================================
SELECT '=== HERRY''S TRANSACTIONS ===' as section;
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
LIMIT 20;

-- =====================================================
-- 7. HERRY'S DOWNLINE (Direct Referrals)
-- =====================================================
SELECT '=== HERRY''S DOWNLINE TEAM ===' as section;
SELECT 
  id,
  name,
  ibo_number,
  email,
  created_at
FROM users 
WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 8. HERRY'S INCOME BREAKDOWN
-- =====================================================
SELECT '=== HERRY''S INCOME BREAKDOWN ===' as section;
SELECT 
  referral_income,
  repurchase_income,
  maintenance_income,
  rank_bonus_income,
  salary_income,
  total_income
FROM income_breakdown 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 9. HERRY'S RANK STATUS
-- =====================================================
SELECT '=== HERRY''S RANK STATUS ===' as section;
SELECT 
  r.name as current_rank,
  r.level_order,
  r.team_sales_target,
  r.personal_sales_target,
  r.min_active_members,
  r.salary,
  r.rank_bonus
FROM ranks r
WHERE r.level_order = 1; -- Default to Team Member for now

-- =====================================================
-- 10. HERRY'S ACTIVITY SUMMARY
-- =====================================================
SELECT '=== HERRY''S ACTIVITY SUMMARY ===' as section;
SELECT 
  'Personal Orders' as metric,
  COUNT(*)::text as value,
  'Worth: ' || COALESCE(SUM(total_amount)::text, '0') as details
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
UNION ALL
SELECT 
  'Commissions Earned' as metric,
  COUNT(*)::text as value,
  'Worth: ' || COALESCE(SUM(commission_amount)::text, '0') as details
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
UNION ALL
SELECT 
  'Direct Referrals' as metric,
  COUNT(*)::text as value,
  'Team Members' as details
FROM users 
WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
UNION ALL
SELECT 
  'Wallet Balance' as metric,
  COALESCE(SUM(balance), 0)::text as value,
  'Total Across All Wallets' as details
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

SELECT '=== HERRY MASWANGANY PROFILE CHECK COMPLETE ===' as final_section;
