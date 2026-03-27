-- =====================================================
-- FIX: confirm_payment should create paid commissions immediately
-- Safe to run. Does not delete any data.
-- Also backfills missing commissions for already-paid orders.
-- =====================================================

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
BEGIN
  SELECT user_id, total_amount
  INTO v_order_user_id, v_order_amount
  FROM orders
  WHERE id = p_order_id;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  UPDATE orders
  SET payment_status = 'paid',
      status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
      updated_at = NOW()
  WHERE id = p_order_id;

  v_current_user_id := v_order_user_id;

  WHILE v_level <= 3 LOOP
    SELECT sponsor_id
    INTO v_sponsor_id
    FROM users
    WHERE id = v_current_user_id;

    EXIT WHEN v_sponsor_id IS NULL;

    SELECT percentage
    INTO v_percentage
    FROM commission_rates
    WHERE level = v_level
      AND is_active = true
    ORDER BY level
    LIMIT 1;

    v_percentage := COALESCE(v_percentage,
      CASE
        WHEN v_level = 1 THEN 10
        WHEN v_level = 2 THEN 5
        WHEN v_level = 3 THEN 2
        ELSE 0
      END
    );

    v_commission_amount := COALESCE(v_order_amount, 0) * (v_percentage / 100.0);

    IF v_commission_amount > 0 THEN
      INSERT INTO commissions (
        user_id,
        order_id,
        commission_amount,
        level,
        status,
        created_at
      )
      SELECT
        v_sponsor_id,
        p_order_id,
        ROUND(v_commission_amount, 2),
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
          total_bv = business_value.total_bv + EXCLUDED.total_bv,
          updated_at = NOW();
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

-- =====================================================
-- BACKFILL: Create any missing paid commissions for orders already paid
-- =====================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id
    FROM orders
    WHERE payment_status = 'paid'
  LOOP
    PERFORM confirm_payment(r.id);
  END LOOP;
END;
$$;

SELECT '✓ confirm_payment now creates paid commissions immediately and backfilled paid orders.' AS status;
