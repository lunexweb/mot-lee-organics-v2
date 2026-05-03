-- =====================================================
-- FIX REPURCHASE COMMISSIONS — Complete overhaul
-- Safe to re-run (idempotent). Does not delete data.
--
-- What this fixes:
--   1. confirm_payment now detects referral vs repurchase
--   2. Commissions are marked 'paid' + wallet credited IMMEDIATELY
--   3. Existing commissions are backfilled with correct types & wallet credits
-- =====================================================

-- =====================================================
-- 1. ENSURE commission_type COLUMN EXISTS
-- =====================================================
ALTER TABLE commissions
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'referral';

CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(commission_type);

-- Allow level 0 for buyer repurchase cashback commissions
ALTER TABLE commissions DROP CONSTRAINT IF EXISTS commissions_level_check;
ALTER TABLE commissions ADD CONSTRAINT commissions_level_check CHECK (level >= 0);

-- =====================================================
-- 2. REPLACE confirm_payment FUNCTION
--    - Detects first order (referral) vs repeat order (repurchase)
--    - Sets commission_type on each commission
--    - Marks commission as 'paid' immediately
--    - Credits upline's e-wallet automatically
--    - Logs a transaction for each credit
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
  v_inserted BOOLEAN;
  v_is_repeat_order BOOLEAN;
  v_repurchase_amount NUMERIC;
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

  -- -------------------------------------------------------
  -- PART A: Upline commissions (levels 1-3) = 'referral'
  --         All upline earnings are called referral income
  -- -------------------------------------------------------
  v_current_user_id := v_order_user_id;

  WHILE v_level <= 3 LOOP
    SELECT sponsor_id
    INTO v_sponsor_id
    FROM users
    WHERE id = v_current_user_id;

    EXIT WHEN v_sponsor_id IS NULL;

    -- Get commission rate (fallback: 10%, 5%, 2%)
    SELECT percentage
    INTO v_percentage
    FROM commission_rates
    WHERE level = v_level AND is_active = true
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
      v_inserted := FALSE;

      -- All upline commissions = 'referral' type
      INSERT INTO commissions (
        user_id, order_id, commission_amount, commission_type, level, status, created_at
      )
      SELECT
        v_sponsor_id, p_order_id, ROUND(v_commission_amount, 2), 'referral', v_level, 'paid', NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM commissions c
        WHERE c.user_id = v_sponsor_id AND c.order_id = p_order_id AND c.level = v_level
      );

      IF FOUND THEN
        v_inserted := TRUE;
      END IF;

      -- Credit upline wallet immediately
      IF v_inserted THEN
        INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
        VALUES (v_sponsor_id, 'e_wallet', ROUND(v_commission_amount, 2), ROUND(v_commission_amount, 2))
        ON CONFLICT (user_id, wallet_type)
        DO UPDATE SET
          balance = wallets.balance + ROUND(v_commission_amount, 2),
          available_for_withdrawal = wallets.available_for_withdrawal + ROUND(v_commission_amount, 2),
          updated_at = NOW();

        INSERT INTO transactions (user_id, transaction_type, amount, source_type, source_name, description, wallet_type)
        VALUES (
          v_sponsor_id, 'credit', ROUND(v_commission_amount, 2), 'commission',
          'Referral Commission',
          'Level ' || v_level || ' referral commission (' || v_percentage || '%) from order',
          'e_wallet'
        );
      END IF;

      -- Update business value
      SELECT EXISTS (
        SELECT 1 FROM business_value bv
        WHERE bv.user_id = v_sponsor_id AND bv.level = v_level AND bv.total_bv >= COALESCE(v_order_amount, 0)
      ) INTO v_bv_exists;

      IF NOT v_bv_exists THEN
        INSERT INTO business_value (user_id, level, total_bv)
        VALUES (v_sponsor_id, v_level, COALESCE(v_order_amount, 0))
        ON CONFLICT (user_id, level)
        DO UPDATE SET total_bv = business_value.total_bv + EXCLUDED.total_bv, updated_at = NOW();
      END IF;
    END IF;

    v_current_user_id := v_sponsor_id;
    v_level := v_level + 1;
  END LOOP;

  -- -------------------------------------------------------
  -- PART B: Buyer cashback 5% on REPEAT orders = 'repurchase'
  --         The buyer themselves gets 5% back on their own repeat purchases
  -- -------------------------------------------------------
  SELECT COUNT(*) > 0
  INTO v_is_repeat_order
  FROM orders
  WHERE user_id = v_order_user_id
    AND payment_status = 'paid'
    AND id != p_order_id;

  IF v_is_repeat_order THEN
    v_repurchase_amount := ROUND(COALESCE(v_order_amount, 0) * 0.05, 2);

    IF v_repurchase_amount > 0 THEN
      -- Insert repurchase cashback commission for the buyer
      INSERT INTO commissions (
        user_id, order_id, commission_amount, commission_type, level, status, created_at
      )
      SELECT
        v_order_user_id, p_order_id, v_repurchase_amount, 'repurchase', 0, 'paid', NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM commissions c
        WHERE c.user_id = v_order_user_id AND c.order_id = p_order_id AND c.commission_type = 'repurchase'
      );

      IF FOUND THEN
        -- Credit buyer's own e-wallet with the cashback
        INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
        VALUES (v_order_user_id, 'e_wallet', v_repurchase_amount, v_repurchase_amount)
        ON CONFLICT (user_id, wallet_type)
        DO UPDATE SET
          balance = wallets.balance + v_repurchase_amount,
          available_for_withdrawal = wallets.available_for_withdrawal + v_repurchase_amount,
          updated_at = NOW();

        INSERT INTO transactions (user_id, transaction_type, amount, source_type, source_name, description, wallet_type)
        VALUES (
          v_order_user_id, 'credit', v_repurchase_amount, 'commission',
          'Repurchase Cashback',
          '5% repurchase cashback on repeat order',
          'e_wallet'
        );
      END IF;
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION confirm_payment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_payment(UUID) TO service_role;

-- =====================================================
-- 3. BACKFILL: Fix commission_type on existing commissions
--    All upline commissions (level 1/2/3) = 'referral'
--    Buyer cashback commissions (level 0) = 'repurchase'
-- =====================================================

-- All upline-level commissions = referral
UPDATE commissions
SET commission_type = 'referral'
WHERE level > 0
  AND (commission_type IS NULL OR commission_type NOT IN ('referral', 'rank_bonus', 'salary'));

-- First: fix payment_status on orders that were marked paid via the old orders page
-- (old "Mark Paid" only set status='processing' but forgot payment_status)
UPDATE orders
SET payment_status = 'paid'
WHERE status IN ('processing', 'shipped', 'delivered')
  AND (payment_status IS NULL OR payment_status != 'paid');

-- Add missing 5% repurchase cashback for buyers who already have repeat orders
-- (only for buyers who had a second+ paid order but no repurchase commission yet)
INSERT INTO commissions (user_id, order_id, commission_amount, commission_type, level, status, created_at)
SELECT
  o.user_id,
  o.id AS order_id,
  ROUND(o.total_amount * 0.05, 2) AS commission_amount,
  'repurchase',
  0,
  'paid',
  NOW()
FROM orders o
WHERE o.payment_status = 'paid'
  -- Must be a repeat order (not the earliest paid order for this user)
  AND o.id != (
    SELECT o2.id FROM orders o2
    WHERE o2.user_id = o.user_id AND o2.payment_status = 'paid'
    ORDER BY o2.created_at ASC LIMIT 1
  )
  -- No repurchase commission already exists for this order
  AND NOT EXISTS (
    SELECT 1 FROM commissions c
    WHERE c.order_id = o.id AND c.commission_type = 'repurchase'
  );

-- =====================================================
-- 4. BACKFILL: Credit wallets for any 'pending' commissions
--    that were never paid out to wallets
-- =====================================================

-- 4a. Mark all pending commissions as paid
UPDATE commissions
SET status = 'paid'
WHERE status = 'pending';

-- 4b. Recalculate ALL e-wallet balances from source-of-truth
--     (commissions table = total earned, withdrawals table = total withdrawn/locked)
WITH
  earned AS (
    SELECT user_id, COALESCE(SUM(commission_amount), 0) AS total
    FROM commissions
    WHERE status = 'paid'
    GROUP BY user_id
  ),
  withdrawn AS (
    SELECT user_id, COALESCE(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE status = 'paid'
    GROUP BY user_id
  ),
  locked AS (
    SELECT user_id, COALESCE(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE status IN ('pending', 'approved')
    GROUP BY user_id
  )
UPDATE wallets w
SET
  balance              = COALESCE(e.total, 0) - COALESCE(p.total, 0),
  available_for_withdrawal = COALESCE(e.total, 0) - COALESCE(p.total, 0) - COALESCE(l.total, 0),
  total_withdrawn      = COALESCE(p.total, 0),
  updated_at           = NOW()
FROM earned e
LEFT JOIN withdrawn p ON p.user_id = e.user_id
LEFT JOIN locked l    ON l.user_id = e.user_id
WHERE w.user_id = e.user_id
  AND w.wallet_type = 'e_wallet';

-- =====================================================
-- 5. RECREATE income_breakdown VIEW
--    (must match commission_type values)
-- =====================================================
CREATE OR REPLACE VIEW income_breakdown AS
SELECT
  u.id as user_id,
  COALESCE(referral.total, 0) as referral_income,
  COALESCE(repurchase.total, 0) as repurchase_income,
  COALESCE(maintenance.total, 0) as maintenance_income,
  COALESCE(rank_bonus.total, 0) as rank_bonus_income,
  COALESCE(salary.total, 0) as salary_income,
  COALESCE(referral.total, 0) +
    COALESCE(repurchase.total, 0) +
    COALESCE(maintenance.total, 0) +
    COALESCE(rank_bonus.total, 0) +
    COALESCE(salary.total, 0) as total_income
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
) salary ON u.id = salary.user_id;

GRANT ALL ON income_breakdown TO authenticated;
GRANT ALL ON income_breakdown TO service_role;

SELECT '✓ Repurchase commission system fixed. All commissions now auto-credit to e-wallet.' AS status;
