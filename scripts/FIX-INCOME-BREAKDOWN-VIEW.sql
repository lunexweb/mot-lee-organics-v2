-- =====================================================
-- FIX INCOME BREAKDOWN VIEW
-- Recreates the view that shows income on dashboard
-- Run this in production Supabase SQL Editor
-- =====================================================

DROP VIEW IF EXISTS income_breakdown;

CREATE OR REPLACE VIEW income_breakdown AS
SELECT 
  u.id as user_id,
  COALESCE(referral.total, 0) as referral_income,
  COALESCE(repurchase.total, 0) as repurchase_income,
  COALESCE(maintenance.total, 0) as maintenance_income,
  COALESCE(rank_bonus.total, 0) as rank_bonus_income,
  COALESCE(salary.total, 0) as salary_income,
  COALESCE(all_income.total, 0) as total_income
FROM users u
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE commission_type = 'referral' AND status = 'paid'
  GROUP BY user_id
) referral ON u.id = referral.user_id
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE commission_type = 'repurchase' AND status = 'paid'
  GROUP BY user_id
) repurchase ON u.id = repurchase.user_id
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE commission_type = 'maintenance' AND status = 'paid'
  GROUP BY user_id
) maintenance ON u.id = maintenance.user_id
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE commission_type = 'rank_bonus' AND status = 'paid'
  GROUP BY user_id
) rank_bonus ON u.id = rank_bonus.user_id
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE commission_type = 'salary' AND status = 'paid'
  GROUP BY user_id
) salary ON u.id = salary.user_id
LEFT JOIN (
  SELECT user_id, SUM(commission_amount) as total
  FROM commissions 
  WHERE status = 'paid'
  GROUP BY user_id
) all_income ON u.id = all_income.user_id;

-- Grant access to authenticated users
GRANT SELECT ON income_breakdown TO authenticated;
GRANT SELECT ON income_breakdown TO service_role;

SELECT '✅ Income breakdown view recreated! Refresh your dashboard.' AS status;
