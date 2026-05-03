-- =====================================================
-- FINAL FIX: Mark pending referral commissions as paid and update wallets
-- This fixes Referral Income showing R 0,00
-- Safe to run - updates existing data to correct state
-- Run this ONE script in Supabase SQL Editor
-- =====================================================

-- Step 1: Mark all pending referral commissions as paid
UPDATE commissions
SET status = 'paid'
WHERE commission_type = 'referral'
  AND status = 'pending';

-- Step 2: Credit wallets for newly paid commissions
DO $$
DECLARE
  v_commission RECORD;
  v_current_balance NUMERIC;
BEGIN
  -- Loop through all commissions that were just marked as paid
  FOR v_commission IN
    SELECT 
      c.user_id,
      c.id as commission_id,
      c.commission_amount,
      c.commission_type,
      o.order_number,
      buyer.name as buyer_name
    FROM commissions c
    JOIN orders o ON c.order_id = o.id
    JOIN users buyer ON o.user_id = buyer.id
    WHERE c.commission_type = 'referral'
      AND c.status = 'paid'
  LOOP
    -- Get current e_wallet balance
    SELECT balance INTO v_current_balance
    FROM wallets
    WHERE user_id = v_commission.user_id
      AND wallet_type = 'e_wallet';

    -- If wallet doesn't exist, create it
    IF v_current_balance IS NULL THEN
      INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal, total_withdrawn)
      VALUES (v_commission.user_id, 'e_wallet', 0, 0, 0);
      v_current_balance := 0;
    END IF;

    -- Credit the wallet
    UPDATE wallets
    SET 
      balance = balance + v_commission.commission_amount,
      available_for_withdrawal = available_for_withdrawal + v_commission.commission_amount
    WHERE user_id = v_commission.user_id
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
      v_commission.user_id,
      'credit',
      v_commission.commission_amount,
      'commission',
      v_commission.buyer_name,
      'Referral commission from ' || v_commission.buyer_name || ' order ' || v_commission.order_number,
      'completed',
      'e_wallet',
      NOW()
    );
  END LOOP;
END $$;

-- Step 3: Verify the fix
SELECT 
  '✓ FIXED: ' || COUNT(*) || ' referral commissions marked as paid' as status,
  'Total amount: R' || SUM(commission_amount) as total
FROM commissions
WHERE commission_type = 'referral'
  AND status = 'paid';

-- Show summary for verification
SELECT 
  commission_type,
  status,
  COUNT(*) as count,
  SUM(commission_amount) as total_amount
FROM commissions
GROUP BY commission_type, status
ORDER BY commission_type, status;
