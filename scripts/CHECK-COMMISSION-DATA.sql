-- =====================================================
-- CHECK COMMISSION DATA
-- Diagnose why dashboard shows R 0,00
-- Run this in production Supabase SQL Editor
-- =====================================================

-- Check commission types and counts
SELECT 
  commission_type,
  status,
  level,
  COUNT(*) as count,
  SUM(commission_amount) as total_amount
FROM commissions
GROUP BY commission_type, status, level
ORDER BY commission_type, status, level;

-- Check specific user's commissions (replace with your IBO number)
SELECT 
  c.commission_type,
  c.level,
  c.status,
  c.commission_amount,
  c.created_at,
  u.name as user_name,
  u.ibo_number
FROM commissions c
JOIN users u ON c.user_id = u.id
WHERE u.ibo_number = 'IBO-N8P5RAKR'
ORDER BY c.created_at DESC
LIMIT 20;

-- Check income_breakdown view for your user
SELECT * FROM income_breakdown
WHERE user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR');
