-- COMPLETE DATABASE OVERVIEW - Everything in One Query
-- This will show you exactly what's in your Mot-Lee Organics database

-- =====================================================
-- 1. ALL TABLES THAT EXIST
-- =====================================================
SELECT '=== ALL TABLES IN DATABASE ===' as section, '' as table_name, '' as details;
SELECT table_name, table_type, '' as details
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- =====================================================
-- 2. USERS TABLE - YOUR ACCOUNT
-- =====================================================
SELECT '=== USERS TABLE - YOUR ACCOUNT ===' as section, '' as table_name, '' as details;
SELECT 'Your User Record', '', ''
UNION ALL
SELECT column_name, data_type, is_nullable::text
FROM information_schema.columns 
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- =====================================================
-- 3. YOUR ACTUAL USER DATA
-- =====================================================
SELECT '=== YOUR ACTUAL USER DATA ===' as section, '' as table_name, '' as details;
SELECT * FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 4. ALL ORDERS (IF ANY)
-- =====================================================
SELECT '=== ALL ORDERS IN SYSTEM ===' as section, '' as table_name, '' as details;
SELECT 
  'Total Orders', 
  COUNT(*)::text, 
  'SUM: ' || COALESCE(SUM(total_amount)::text, '0')
FROM orders
UNION ALL
SELECT 'Your Orders', COUNT(*)::text, 'SUM: ' || COALESCE(SUM(total_amount)::text, '0')
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 5. ALL COMMISSIONS (IF ANY)
-- =====================================================
SELECT '=== ALL COMMISSIONS IN SYSTEM ===' as section, '' as table_name, '' as details;
SELECT 
  'Total Commissions', 
  COUNT(*)::text, 
  'SUM: ' || COALESCE(SUM(commission_amount)::text, '0')
FROM commissions
UNION ALL
SELECT 'Your Commissions', COUNT(*)::text, 'SUM: ' || COALESCE(SUM(commission_amount)::text, '0')
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 6. WALLET BALANCES
-- =====================================================
SELECT '=== WALLET BALANCES ===' as section, '' as table_name, '' as details;
SELECT wallet_type, balance::text, available_for_withdrawal::text
FROM wallets 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');

-- =====================================================
-- 7. YOUR DOWNLINE TEAM
-- =====================================================
SELECT '=== YOUR DOWNLINE TEAM ===' as section, '' as table_name, '' as details;
SELECT 
  name, 
  ibo_number, 
  email, 
  created_at::text
FROM users 
WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 8. RECENT ACTIVITY
-- =====================================================
SELECT '=== RECENT ACTIVITY ===' as section, '' as table_name, '' as details;
SELECT 'Recent Orders', '', ''
UNION ALL
SELECT 'Order #' || order_number, total_amount::text, created_at::text
FROM orders 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 5
UNION ALL
SELECT 'Recent Commissions', '', ''
UNION ALL
SELECT commission_amount::text, status, created_at::text
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC
LIMIT 5;

-- =====================================================
-- 9. SYSTEM SUMMARY
-- =====================================================
SELECT '=== SYSTEM SUMMARY ===' as section, '' as table_name, '' as details;
SELECT 
  'Total Users', 
  COUNT(*)::text, 
  'With IBO Numbers'
FROM users 
WHERE ibo_number IS NOT NULL
UNION ALL
SELECT 
  'Total Orders', 
  COUNT(*)::text, 
  'Worth: ' || COALESCE(SUM(total_amount)::text, '0')
FROM orders
UNION ALL
SELECT 
  'Total Commissions', 
  COUNT(*)::text, 
  'Worth: ' || COALESCE(SUM(commission_amount)::text, '0')
FROM commissions
UNION ALL
SELECT 
  'Wallet Records', 
  COUNT(*)::text, 
  'For ' || COUNT(DISTINCT user_id)::text || ' users'
FROM wallets;

SELECT '=== COMPLETE OVERVIEW FINISHED ===' as final_section, '', '';
