-- =====================================================
-- DEBUG GENEALOGY FUNCTION
-- Run this to test and fix the function
-- =====================================================

-- Test 1: Check if function exists and its signature
SELECT 
    proname,
    pronargs,
    proargtypes::regtype[]
FROM pg_proc 
WHERE proname = 'get_genealogy_tree';

-- Test 2: Try calling the function with Herry's ID directly
-- First get Herry's ID
SELECT 'HERRY USER ID' as test, id FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- Test 3: Call the function with Herry's ID
-- Replace the UUID with Herry's actual ID from above
SELECT * FROM get_genealogy_tree(
    'YOUR_HERRY_UUID_HERE'::uuid, 
    7
);

-- Test 4: Create a simplified version to debug
CREATE OR REPLACE FUNCTION get_genealogy_tree_simple(
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
  total_earnings NUMERIC,
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
      u.status::text,
      0::bigint as personal_sales,
      0::numeric as total_earnings,
      0::bigint as downline_count
    FROM users u
    WHERE u.id = get_genealogy_tree_simple.user_id
    
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
      u.status::text,
      0::bigint as personal_sales,
      0::numeric as total_earnings,
      0::bigint as downline_count
    FROM users u
    JOIN genealogy g ON u.sponsor_id = g.id
    WHERE g.level < max_levels - 1
  )
  SELECT * FROM genealogy
  ORDER BY level, name;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_genealogy_tree_simple TO authenticated;
GRANT EXECUTE ON FUNCTION get_genealogy_tree_simple TO service_role;

-- Test the simplified function
-- Replace with Herry's actual ID
SELECT * FROM get_genealogy_tree_simple(
    'YOUR_HERRY_UUID_HERE'::uuid, 
    7
);
