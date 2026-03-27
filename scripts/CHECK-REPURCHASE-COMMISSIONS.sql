-- =====================================================
-- CHECK REPURCHASE COMMISSIONS
-- See if they exist and what status they have
-- =====================================================

-- Check all repurchase commissions
SELECT 
  commission_type,
  status,
  level,
  COUNT(*) as count,
  SUM(commission_amount) as total
FROM commissions
WHERE commission_type = 'repurchase' OR level = 0
GROUP BY commission_type, status, level;

-- Check your specific repurchase commissions
SELECT 
  c.id,
  c.commission_type,
  c.level,
  c.status,
  c.commission_amount,
  o.order_number,
  c.created_at
FROM commissions c
JOIN orders o ON c.order_id = o.id
WHERE c.user_id = (SELECT id FROM users WHERE ibo_number = 'IBO-N8P5RAKR')
  AND (c.level = 0 OR c.commission_type = 'repurchase')
ORDER BY c.created_at DESC;

-- Count repeat orders (should have repurchase)
SELECT COUNT(*) as repeat_order_count
FROM (
  SELECT user_id, COUNT(*) as order_count
  FROM orders
  WHERE payment_status = 'paid'
  GROUP BY user_id
  HAVING COUNT(*) > 1
) subquery;
