-- =====================================================
-- AUTO-CREDIT WALLETS WHEN ADMIN APPROVES COMMISSIONS
-- When admin marks commission as "paid", automatically credit wallet
-- Safe to run - works for all users automatically
-- =====================================================

-- Create function to auto-credit wallet when commission is marked paid
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
    
    -- Get buyer name and order number for transaction description
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

-- Create trigger on commissions table
DROP TRIGGER IF EXISTS auto_credit_wallet_trigger ON commissions;

CREATE TRIGGER auto_credit_wallet_trigger
  AFTER UPDATE ON commissions
  FOR EACH ROW
  EXECUTE FUNCTION auto_credit_wallet_on_commission_paid();

SELECT '✓ Auto-credit trigger created! Wallets will now update automatically when admin approves commissions.' AS status;
