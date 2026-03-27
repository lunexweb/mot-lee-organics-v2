-- Check Existing Mot-Lee Organics Data
-- This will show all your existing MLM data

-- =====================================================
-- 1. YOUR USER PROFILE
-- =====================================================
SELECT '=== YOUR USER PROFILE ===' as section;
SELECT id, name, ibo_number, email, role, sponsor_id, created_at FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- =====================================================
-- 2. ALL YOUR ORDERS (No Status Assumptions)
-- =====================================================
SELECT '=== ALL YOUR ORDERS ===' as section;
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
-- 3. ALL COMMISSIONS YOU'VE EARNED
-- =====================================================
SELECT '=== ALL YOUR COMMISSIONS ===' as section;
SELECT 
  id, 
  commission_amount, 
  status, 
  level, 
  commission_type,
  created_at
FROM commissions 
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
ORDER BY created_at DESC;

-- =====================================================
-- 4. YOUR DOWNLINE (Genealogy)
-- =====================================================
SELECT '=== YOUR DOWNLINE TEAM ===' as section;
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
-- 5. YOUR GENEALOGY TREE (All Levels)
-- =====================================================
SELECT '=== YOUR COMPLETE GENEALOGY ===' as section;
WITH RECURSIVE downline AS (
  -- Base: Direct referrals
  SELECT 
    id, name, ibo_number, sponsor_id, 1 as genealogy_level, created_at,
    ARRAY[name] as path
  FROM users 
  WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
  
  UNION ALL
  
  -- Recursive: All levels down
  SELECT 
    u.id, u.name, u.ibo_number, u.sponsor_id, d.genealogy_level + 1, u.created_at,
    d.path || u.name
  FROM users u
  JOIN downline d ON u.sponsor_id = d.id
  WHERE d.genealogy_level < 7
)
SELECT 
  genealogy_level as level,
  COUNT(*) as members_at_level,
  STRING_AGG(name, ', ' ORDER BY name) as member_names
FROM downline
GROUP BY genealogy_level
ORDER BY genealogy_level;

-- =====================================================
-- 6. YOUR CURRENT RANK STATUS
-- =====================================================
SELECT '=== YOUR RANK STATUS ===' as section;
SELECT 
  r.name as current_rank,
  r.level_order,
  r.team_sales_target,
  r.personal_sales_target,
  r.min_active_members,
  r.salary,
  r.rank_bonus
FROM ranks r
WHERE r.level_order = (
  SELECT COALESCE(MAX(level_order), 1)
  FROM ranks rk
  WHERE rk.team_sales_target <= COALESCE((
    SELECT COUNT(*) * 600  -- Assuming R600 per order
    FROM orders o
    WHERE o.user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
    OR o.user_id IN (
      SELECT id FROM users WHERE sponsor_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
    )
  ), 0)
  AND rk.personal_sales_target <= COALESCE((
    SELECT COUNT(*) * 600
    FROM orders 
    WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
  ), 0)
);

-- =====================================================
-- 7. SYSTEM WIDE ORDERS (Check if any exist)
-- =====================================================
SELECT '=== SYSTEM ORDERS OVERVIEW ===' as section;
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount) as total_sales,
  COUNT(DISTINCT user_id) as unique_customers
FROM orders;

-- =====================================================
-- 8. SYSTEM COMMISSIONS OVERVIEW
-- =====================================================
SELECT '=== SYSTEM COMMISSIONS OVERVIEW ===' as section;
SELECT 
  COUNT(*) as total_commissions,
  SUM(commission_amount) as total_commission_amount,
  COUNT(DISTINCT user_id) as users_earned_commissions
FROM commissions;

SELECT '=== MOT-LEE ORGANICS DATA CHECK COMPLETE ===' as final_section;
