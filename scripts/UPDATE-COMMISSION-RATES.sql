-- =====================================================
-- UPDATE COMMISSION RATES to match compensation plan
-- Changes: 10%, 5%, 2% → 20%, 10%, 5%
-- Run this ONE script in Supabase SQL Editor
-- =====================================================

-- Update commission rates to correct percentages
UPDATE commission_rates SET percentage = 0.20 WHERE level = 1;
UPDATE commission_rates SET percentage = 0.10 WHERE level = 2;
UPDATE commission_rates SET percentage = 0.05 WHERE level = 3;

-- Verify the update
SELECT 
  level,
  (percentage * 100) || '%' as rate,
  is_active
FROM commission_rates
ORDER BY level;

SELECT '✓ Commission rates updated to: 20%, 10%, 5%' AS status;
