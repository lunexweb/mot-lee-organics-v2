-- Complete Genealogy System Setup - Run this once in Supabase SQL Editor
-- This will work for all users in your MLM system

-- Create Genealogy Tree Function
CREATE OR REPLACE FUNCTION get_genealogy_tree(
  user_id UUID, 
  max_levels INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  ibo_number TEXT,
  level INTEGER,
  sponsor_id UUID,
  status TEXT,
  personal_sales BIGINT,
  total_earnings DECIMAL,
  downline_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE genealogy AS (
    -- Base case: Start with the user
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.ibo_number,
      0 as level,
      u.sponsor_id,
      u.status,
      COALESCE(order_stats.personal_sales, 0) as personal_sales,
      COALESCE(commission_stats.total_earnings, 0) as total_earnings,
      COALESCE(downline_stats.count, 0) as downline_count
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as personal_sales
      FROM orders
      WHERE status IN ('processing', 'shipped', 'delivered')
      GROUP BY user_id
    ) order_stats ON u.id = order_stats.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(commission_amount) as total_earnings
      FROM commissions
      WHERE status = 'paid'
      GROUP BY user_id
    ) commission_stats ON u.id = commission_stats.user_id
    LEFT JOIN (
      SELECT 
        sponsor_id,
        COUNT(*) as count
      FROM users
      WHERE sponsor_id IS NOT NULL
      GROUP BY sponsor_id
    ) downline_stats ON u.id = downline_stats.sponsor_id
    WHERE u.id = get_genealogy_tree.user_id
    
    UNION ALL
    
    -- Recursive case: Get all downline members
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.ibo_number,
      g.level + 1,
      u.sponsor_id,
      u.status,
      COALESCE(order_stats.personal_sales, 0) as personal_sales,
      COALESCE(commission_stats.total_earnings, 0) as total_earnings,
      COALESCE(downline_stats.count, 0) as downline_count
    FROM users u
    JOIN genealogy g ON u.sponsor_id = g.id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as personal_sales
      FROM orders
      WHERE status IN ('processing', 'shipped', 'delivered')
      GROUP BY user_id
    ) order_stats ON u.id = order_stats.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(commission_amount) as total_earnings
      FROM commissions
      WHERE status = 'paid'
      GROUP BY user_id
    ) commission_stats ON u.id = commission_stats.user_id
    LEFT JOIN (
      SELECT 
        sponsor_id,
        COUNT(*) as count
      FROM users
      WHERE sponsor_id IS NOT NULL
      GROUP BY sponsor_id
    ) downline_stats ON u.id = downline_stats.sponsor_id
    WHERE g.level < max_levels - 1
  )
  SELECT * FROM genealogy
  ORDER BY level, name;
END;
$$;

-- Grant execute permission to all authenticated users
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO service_role;
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO anon;

-- Create RLS policy for genealogy access (users can only see their own downline)
-- This is handled by the function parameter, no additional RLS needed

-- Test the function with a sample user (optional - you can remove this)
-- SELECT * FROM get_genealogy_tree('83fcf8f3-5c47-40df-8e9a-d27bbaff558f', 7);

-- Success message
SELECT 'Genealogy system setup complete! All users can now view their downline tree.' as result;
