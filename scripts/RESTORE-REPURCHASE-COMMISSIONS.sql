-- =====================================================
-- RESTORE REPURCHASE COMMISSIONS
-- Fixes repurchase commissions that were accidentally changed
-- Safe to run - no data deleted
-- =====================================================

-- Step 1: Restore repurchase commissions (5% cashback for buyers on their 2nd+ order)
-- These should be commission_type = 'repurchase', level = 0

-- Find all repeat orders and ensure they have repurchase commissions
DO $$
DECLARE
  r RECORD;
  v_order_count INTEGER;
  v_repurchase_amount NUMERIC;
  v_existing_repurchase BOOLEAN;
BEGIN
  FOR r IN
    SELECT o.id as order_id, o.user_id, o.total_amount, o.created_at
    FROM orders o
    WHERE o.payment_status = 'paid'
      AND o.status IN ('processing', 'shipped', 'delivered')
    ORDER BY o.user_id, o.created_at
  LOOP
    -- Count how many paid orders this user had BEFORE this order
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE user_id = r.user_id
      AND payment_status = 'paid'
      AND created_at < r.created_at;

    -- Only process if this is a repeat order (2nd+ order)
    IF v_order_count > 0 THEN
      -- Calculate 5% repurchase cashback
      v_repurchase_amount := r.total_amount * 0.05;

      -- Update or insert repurchase commission
      -- First try to update existing level=0 commission
      UPDATE commissions
      SET commission_type = 'repurchase',
          commission_amount = ROUND(v_repurchase_amount, 2),
          status = 'pending'
      WHERE order_id = r.order_id
        AND user_id = r.user_id
        AND level = 0;
      
      -- If no rows were updated, insert new one
      IF NOT FOUND THEN
        INSERT INTO commissions (
          user_id,
          order_id,
          commission_amount,
          commission_type,
          level,
          status,
          created_at
        )
        VALUES (
          r.user_id,
          r.order_id,
          ROUND(v_repurchase_amount, 2),
          'repurchase',
          0,
          'pending',
          NOW()
        );
      END IF;
    END IF;
  END LOOP;
END;
$$;

-- Verify restoration
SELECT 
  commission_type,
  status,
  COUNT(*) as count,
  SUM(commission_amount) as total_amount
FROM commissions
GROUP BY commission_type, status
ORDER BY commission_type, status;

SELECT '✓ Repurchase commissions restored!' AS status;
