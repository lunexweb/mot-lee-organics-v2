-- =====================================================
-- IMPLEMENT MAINTENANCE COMMISSIONS
-- First order = Referral (20%, 10%, 5%)
-- Repeat orders = Maintenance (20%, 10%, 5%)
-- Safe to run - works for all users, no data deleted
-- =====================================================

-- Drop and recreate confirm_payment function with maintenance support
DROP FUNCTION IF EXISTS confirm_payment(UUID);

CREATE OR REPLACE FUNCTION confirm_payment(
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_order_user_id UUID;
  v_order_amount NUMERIC;
  v_current_user_id UUID;
  v_sponsor_id UUID;
  v_level INTEGER := 1;
  v_percentage NUMERIC;
  v_commission_amount NUMERIC;
  v_bv_exists BOOLEAN;
  v_is_first_order BOOLEAN;
  v_commission_type TEXT;
BEGIN
  -- Get order details
  SELECT user_id, total_amount
  INTO v_order_user_id, v_order_amount
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  -- Update order status
  UPDATE orders
  SET payment_status = 'paid',
      status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END
  WHERE id = p_order_id;

  -- Check if this is the buyer's first paid order
  SELECT COUNT(*) = 0 INTO v_is_first_order
  FROM orders
  WHERE user_id = v_order_user_id
    AND payment_status = 'paid'
    AND id != p_order_id;

  -- Set commission type based on order count
  v_commission_type := CASE 
    WHEN v_is_first_order THEN 'referral'
    ELSE 'maintenance'
  END;

  v_current_user_id := v_order_user_id;

  -- Create commissions for up to 3 levels
  WHILE v_level <= 3 LOOP
    SELECT sponsor_id
    INTO v_sponsor_id
    FROM users
    WHERE id = v_current_user_id;

    EXIT WHEN v_sponsor_id IS NULL;

    -- Get commission rate from commission_rates table
    SELECT percentage
    INTO v_percentage
    FROM commission_rates
    WHERE level = v_level
      AND is_active = true
    ORDER BY level
    LIMIT 1;

    -- Default rates if not in table
    v_percentage := COALESCE(v_percentage,
      CASE
        WHEN v_level = 1 THEN 0.20
        WHEN v_level = 2 THEN 0.10
        WHEN v_level = 3 THEN 0.05
        ELSE 0
      END
    );

    v_commission_amount := COALESCE(v_order_amount, 0) * v_percentage;

    IF v_commission_amount > 0 THEN
      -- Insert commission with proper type (referral or maintenance)
      INSERT INTO commissions (
        user_id,
        order_id,
        commission_amount,
        commission_type,
        level,
        status,
        created_at
      )
      SELECT
        v_sponsor_id,
        p_order_id,
        ROUND(v_commission_amount, 2),
        v_commission_type,
        v_level,
        'pending',
        NOW()
      WHERE NOT EXISTS (
        SELECT 1
        FROM commissions c
        WHERE c.user_id = v_sponsor_id
          AND c.order_id = p_order_id
          AND c.level = v_level
      );

      -- Update business value
      SELECT EXISTS (
        SELECT 1
        FROM business_value bv
        WHERE bv.user_id = v_sponsor_id
          AND bv.level = v_level
          AND bv.total_bv >= COALESCE(v_order_amount, 0)
      ) INTO v_bv_exists;

      IF NOT v_bv_exists THEN
        INSERT INTO business_value (user_id, level, total_bv)
        VALUES (v_sponsor_id, v_level, COALESCE(v_order_amount, 0))
        ON CONFLICT (user_id, level)
        DO UPDATE SET
          total_bv = business_value.total_bv + EXCLUDED.total_bv;
      END IF;
    END IF;

    v_current_user_id := v_sponsor_id;
    v_level := v_level + 1;
  END LOOP;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_payment(UUID) TO service_role;

-- Backfill existing orders to create maintenance commissions for repeat orders
DO $$
DECLARE
  r RECORD;
  v_order_count INTEGER;
  v_commission_type TEXT;
BEGIN
  FOR r IN
    SELECT o.id, o.user_id, o.created_at
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
      AND created_at < (SELECT created_at FROM orders WHERE id = r.id);

    -- First order = referral, others = maintenance
    v_commission_type := CASE 
      WHEN v_order_count = 0 THEN 'referral'
      ELSE 'maintenance'
    END;

    -- Update existing commissions for this order to have correct type
    -- Only update level-based commissions, NOT repurchase commissions
    UPDATE commissions
    SET commission_type = v_commission_type
    WHERE order_id = r.id
      AND level > 0
      AND (commission_type IS NULL OR commission_type NOT IN ('repurchase', 'rank_bonus', 'salary'));
  END LOOP;
END;
$$;

-- Verify the implementation
SELECT 
  commission_type,
  status,
  COUNT(*) as count,
  SUM(commission_amount) as total_amount
FROM commissions
GROUP BY commission_type, status
ORDER BY commission_type, status;

SELECT '✓ Maintenance commissions implemented! First orders = Referral, Repeat orders = Maintenance' AS status;
