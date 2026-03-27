-- Create Missing Database Functions for Dashboard
-- These functions are required by the React frontend

-- =====================================================
-- 1. CREATE GENEALOGY TREE FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_genealogy_tree(max_levels INTEGER DEFAULT 7, p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  level INTEGER,
  user_id UUID,
  name TEXT,
  ibo_number TEXT,
  email TEXT,
  sponsor_id UUID,
  created_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Use provided user_id or get current authenticated user
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  -- Return recursive genealogy tree
  RETURN QUERY
  WITH RECURSIVE genealogy AS (
    -- Base case: The user themselves
    SELECT 
      0 as level,
      id as user_id,
      name,
      ibo_number,
      email,
      sponsor_id,
      created_at
    FROM users 
    WHERE id = current_user_id
    
    UNION ALL
    
    -- Recursive case: All downline members
    SELECT 
      g.level + 1,
      u.id as user_id,
      u.name,
      u.ibo_number,
      u.email,
      u.sponsor_id,
      u.created_at
    FROM users u
    INNER JOIN genealogy g ON u.sponsor_id = g.user_id
    WHERE g.level < max_levels
  )
  SELECT 
    level,
    user_id,
    name,
    ibo_number,
    email,
    sponsor_id,
    created_at
  FROM genealogy
  ORDER BY level, created_at;
END;
$$;

-- =====================================================
-- 2. CREATE DASHBOARD STATS FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  personal_sales BIGINT,
  team_sales BIGINT,
  total_earnings DECIMAL,
  downline_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COUNT(*) FROM orders WHERE user_id = current_user_id), 0) as personal_sales,
    COALESCE((
      SELECT COUNT(*) 
      FROM orders o
      WHERE o.user_id IN (
        SELECT id FROM users WHERE sponsor_id = current_user_id
      )
    ), 0) as team_sales,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND status = 'paid'), 0) as total_earnings,
    COALESCE((SELECT COUNT(*) FROM users WHERE sponsor_id = current_user_id), 0) as downline_count;
END;
$$;

-- =====================================================
-- 3. CREATE INCOME BREAKDOWN FUNCTION
-- =====================================================
CREATE OR REPLACE FUNCTION get_income_breakdown(p_user_id UUID DEFAULT NULL)
RETURNS TABLE(
  referral_income DECIMAL,
  repurchase_income DECIMAL,
  maintenance_income DECIMAL,
  rank_bonus_income DECIMAL,
  salary_income DECIMAL,
  total_income DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user_id UUID;
BEGIN
  current_user_id := COALESCE(p_user_id, auth.uid());
  
  RETURN QUERY
  SELECT 
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND commission_type = 'referral' AND status = 'paid'), 0) as referral_income,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND commission_type = 'repurchase' AND status = 'paid'), 0) as repurchase_income,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND commission_type = 'maintenance' AND status = 'paid'), 0) as maintenance_income,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND commission_type = 'rank_bonus' AND status = 'paid'), 0) as rank_bonus_income,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND commission_type = 'salary' AND status = 'paid'), 0) as salary_income,
    COALESCE((SELECT COALESCE(SUM(commission_amount), 0) FROM commissions WHERE user_id = current_user_id AND status = 'paid'), 0) as total_income;
END;
$$;

-- =====================================================
-- 4. GRANT PERMISSIONS
-- =====================================================
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO service_role;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_dashboard_stats TO service_role;
GRANT EXECUTE ON FUNCTION get_income_breakdown TO authenticated;
GRANT EXECUTE ON FUNCTION get_income_breakdown TO service_role;

SELECT 'Database functions created successfully!' as result;
SELECT 'Dashboard should now be able to fetch data properly' as status;
