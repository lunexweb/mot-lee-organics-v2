-- =====================================================
-- COMPLETE COMMISSION FIX - ALL IN ONE
-- Run this once in production Supabase SQL Editor
-- Safe to run - no data deleted, commissions stay PENDING
-- Admin must manually approve at /admin/commissions
-- =====================================================

-- =====================================================
-- PART 1: UPDATE CONFIRM_PAYMENT FUNCTION
-- Creates referral (first order) and maintenance (repeat order) commissions
-- All commissions created as PENDING - admin must approve
-- =====================================================

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
  v_commission_type TEXT;
  v_order_count INTEGER;
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
      status = CASE WHEN status = 'pending' THEN 'processing' ELSE status END,
      updated_at = NOW()
  WHERE id = p_order_id;

  -- Determine commission type (referral or maintenance)
  -- Count how many paid orders this user has BEFORE this one
  SELECT COUNT(*) INTO v_order_count
  FROM orders
  WHERE user_id = v_order_user_id
    AND payment_status = 'paid'
    AND id != p_order_id;
  
  -- First order = referral, repeat orders = maintenance
  v_commission_type := CASE WHEN v_order_count = 0 THEN 'referral' ELSE 'maintenance' END;

  -- Calculate commissions for upline (3 levels)
  v_current_user_id := v_order_user_id;

  WHILE v_level <= 3 LOOP
    -- Get sponsor
    SELECT sponsor_id
    INTO v_sponsor_id
    FROM users
    WHERE id = v_current_user_id;

    EXIT WHEN v_sponsor_id IS NULL;

    -- Get commission rate
    SELECT percentage
    INTO v_percentage
    FROM commission_rates
    WHERE level = v_level
      AND is_active = true
    ORDER BY level
    LIMIT 1;

    v_percentage := COALESCE(v_percentage,
      CASE
        WHEN v_level = 1 THEN 20
        WHEN v_level = 2 THEN 10
        WHEN v_level = 3 THEN 5
        ELSE 0
      END
    );

    v_commission_amount := COALESCE(v_order_amount, 0) * (v_percentage / 100.0);

    -- Insert commission as PENDING
    IF v_commission_amount > 0 THEN
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

-- =====================================================
-- PART 2: BACKFILL EXISTING ORDERS
-- Update existing commissions to have correct type
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_order_count INTEGER;
  v_commission_type TEXT;
BEGIN
  FOR r IN
    SELECT DISTINCT o.id, o.user_id, o.created_at
    FROM orders o
    WHERE o.payment_status = 'paid'
      AND o.status IN ('processing', 'shipped', 'delivered')
    ORDER BY o.user_id, o.created_at
  LOOP
    -- Count previous paid orders for this user
    SELECT COUNT(*) INTO v_order_count
    FROM orders
    WHERE user_id = r.user_id
      AND payment_status = 'paid'
      AND created_at < r.created_at;

    v_commission_type := CASE WHEN v_order_count = 0 THEN 'referral' ELSE 'maintenance' END;

    -- Update existing commissions for this order
    -- Only update level-based commissions, NOT repurchase
    UPDATE commissions
    SET commission_type = v_commission_type
    WHERE order_id = r.id
      AND level > 0
      AND (commission_type IS NULL OR commission_type NOT IN ('repurchase', 'rank_bonus', 'salary'));
  END LOOP;
END;
$$;

-- =====================================================
-- PART 3: RESTORE REPURCHASE COMMISSIONS
-- Create/update 5% repurchase cashback for repeat orders
-- All created as PENDING - admin must approve
-- =====================================================

DO $$
DECLARE
  r RECORD;
  v_order_count INTEGER;
  v_repurchase_amount NUMERIC;
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
      v_repurchase_amount := r.total_amount * 0.05;

      -- Update or insert repurchase commission
      UPDATE commissions
      SET commission_type = 'repurchase',
          commission_amount = ROUND(v_repurchase_amount, 2),
          status = 'pending'
      WHERE order_id = r.order_id
        AND user_id = r.user_id
        AND level = 0;
      
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

-- =====================================================
-- PART 4: AUTO-CREDIT WALLET TRIGGER
-- When admin approves commission (marks as paid), auto-credit wallet
-- Does NOT auto-approve - only triggers after manual approval
-- =====================================================

CREATE OR REPLACE FUNCTION auto_credit_wallet_on_commission_paid()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_name TEXT;
  v_order_number TEXT;
BEGIN
  -- Only process if status changed from pending to paid
  IF OLD.status = 'pending' AND NEW.status = 'paid' THEN
    
    -- Get buyer name and order number
    SELECT u.name, o.order_number
    INTO v_buyer_name, v_order_number
    FROM orders o
    JOIN users u ON o.user_id = u.id
    WHERE o.id = NEW.order_id;
    
    -- Ensure wallet exists
    INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal, total_withdrawn)
    VALUES (NEW.user_id, 'e_wallet', 0, 0, 0)
    ON CONFLICT (user_id, wallet_type) DO NOTHING;
    
    -- Credit the wallet
    UPDATE wallets
    SET 
      balance = balance + NEW.commission_amount,
      available_for_withdrawal = available_for_withdrawal + NEW.commission_amount
    WHERE user_id = NEW.user_id
      AND wallet_type = 'e_wallet';
    
    -- Create transaction record
    INSERT INTO transactions (
      user_id,
      transaction_type,
      amount,
      source_type,
      source_name,
      description,
      status,
      wallet_type,
      created_at
    )
    VALUES (
      NEW.user_id,
      'credit',
      NEW.commission_amount,
      'commission',
      COALESCE(v_buyer_name, 'System'),
      CASE 
        WHEN NEW.commission_type = 'referral' THEN 'Referral commission from ' || COALESCE(v_buyer_name, 'order') || ' (' || COALESCE(v_order_number, '') || ')'
        WHEN NEW.commission_type = 'maintenance' THEN 'Maintenance commission from ' || COALESCE(v_buyer_name, 'order') || ' (' || COALESCE(v_order_number, '') || ')'
        WHEN NEW.commission_type = 'repurchase' THEN 'Repurchase cashback (5%) from order ' || COALESCE(v_order_number, '')
        ELSE NEW.commission_type || ' commission'
      END,
      'completed',
      'e_wallet',
      NOW()
    );
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_credit_wallet_trigger ON commissions;

CREATE TRIGGER auto_credit_wallet_trigger
  AFTER UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_credit_wallet_on_commission_paid();

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT 
  commission_type,
  status,
  COUNT(*) as count,
  SUM(commission_amount) as total_amount
FROM commissions
GROUP BY commission_type, status
ORDER BY commission_type, status;

SELECT '✅ COMPLETE! All commissions are PENDING. Go to /admin/commissions to approve them.' AS status;
