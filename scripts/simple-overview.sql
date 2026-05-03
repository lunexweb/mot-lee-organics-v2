-- SIMPLE DATABASE OVERVIEW - Everything in One Query
-- This will show you exactly what's in your Mot-Lee Organics database

-- =====================================================
-- 1. ALL TABLES THAT EXIST
-- =====================================================
SELECT '=== ALL TABLES IN DATABASE ===' as info;
SELECT table_name, table_type 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =====================================================
-- 2. YOUR USER RECORD
-- =====================================================
SELECT '=== YOUR USER RECORD ===' as info;
SELECT * FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 3. ALL ORDERS SUMMARY
-- =====================================================
SELECT '=== ALL ORDERS SUMMARY ===' as info;
SELECT 
  'Total Orders in System' as metric,
  COUNT(*) as count,
  COALESCE(SUM(total_amount), 0) as total_amount
FROM orders
UNION ALL
SELECT 
  'Your Orders' as metric,
  COUNT(*) as count,
  COALESCE(SUM(total_amount), 0) as total_amount
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 4. ALL COMMISSIONS SUMMARY
-- =====================================================
SELECT '=== ALL COMMISSIONS SUMMARY ===' as info;
SELECT 
  'Total Commissions in System' as metric,
  COUNT(*) as count,
  COALESCE(SUM(commission_amount), 0) as total_amount
FROM commissions
UNION ALL
SELECT 
  'Your Commissions' as metric,
  COUNT(*) as count,
  COALESCE(SUM(commission_amount), 0) as total_amount
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 5. YOUR WALLET BALANCES
-- =====================================================
SELECT '=== YOUR WALLET BALANCES ===' as info;
SELECT wallet_type, balance, available_for_withdrawal
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 6. YOUR DOWNLINE TEAM
-- =====================================================
SELECT '=== YOUR DOWNLINE TEAM ===' as info;
SELECT name, ibo_number, email, created_at
FROM users 
WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 7. YOUR RECENT ORDERS
-- =====================================================
SELECT '=== YOUR RECENT ORDERS ===' as info;
SELECT order_number, total_amount, status, payment_status, created_at
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 8. YOUR RECENT COMMISSIONS
-- =====================================================
SELECT '=== YOUR RECENT COMMISSIONS ===' as info;
SELECT commission_amount, status, commission_type, level, created_at
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- 9. SYSTEM OVERVIEW
-- =====================================================
SELECT '=== SYSTEM OVERVIEW ===' as info;
SELECT 
  'Total Users' as item,
  COUNT(*) as value
FROM users
UNION ALL
SELECT 
  'Users with IBO Numbers' as item,
  COUNT(*) as value
FROM users 
WHERE ibo_number IS NOT NULL
UNION ALL
SELECT 
  'Total Orders' as item,
  COUNT(*) as value
FROM orders
UNION ALL
SELECT 
  'Total Commissions' as item,
  COUNT(*) as value
FROM commissions;

SELECT '=== OVERVIEW COMPLETE ===' as info;
