-- =====================================================
-- FIX: Team Sales showing R 0,00 due to RLS blocking downline orders
-- This creates a SECURITY DEFINER function to calculate team sales
-- Safe to run - does not delete any data or modify RLS policies
-- =====================================================

-- Create function to get team sales for a user
CREATE OR REPLACE FUNCTION get_user_team_sales(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_team_sales NUMERIC := 0;
BEGIN
  -- Calculate team sales from all downline levels
  WITH RECURSIVE downline AS (
    SELECT id
    FROM users
    WHERE sponsor_id = p_user_id
    
    UNION ALL
    
    SELECT u.id
    FROM users u
    INNER JOIN downline d ON u.sponsor_id = d.id
  )
  SELECT COALESCE(SUM(o.total_amount), 0)
  INTO v_team_sales
  FROM orders o
  INNER JOIN downline d ON o.user_id = d.id
  WHERE o.status IN ('processing', 'shipped', 'delivered');
  
  RETURN v_team_sales;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_team_sales(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_team_sales(UUID) TO service_role;

-- Create function to get downline count for a user
CREATE OR REPLACE FUNCTION get_user_downline_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  -- Count all downline members recursively
  WITH RECURSIVE downline AS (
    SELECT id
    FROM users
    WHERE sponsor_id = p_user_id
    
    UNION ALL
    
    SELECT u.id
    FROM users u
    INNER JOIN downline d ON u.sponsor_id = d.id
  )
  SELECT COUNT(*)
  INTO v_count
  FROM downline;
  
  RETURN v_count;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_downline_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_downline_count(UUID) TO service_role;

-- Test the functions (replace with actual user ID)
-- SELECT get_user_team_sales((SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR'));
-- SELECT get_user_downline_count((SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR'));

SELECT '✓ Functions created successfully. Team sales will now calculate correctly.' AS status;
