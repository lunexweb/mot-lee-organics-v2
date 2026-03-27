-- =====================================================
-- COMPLETE DATABASE SETUP - FINAL VERSION
-- Creates all missing functions for the MLM system
-- Run this ONCE in Supabase SQL Editor
-- =====================================================

-- Step 1: Drop existing functions if they exist
-- =====================================================
DROP FUNCTION IF EXISTS pay_user_commissions(uuid, timestamptz, text) CASCADE;
DROP FUNCTION IF EXISTS get_genealogy_tree CASCADE;

-- Step 2: Create the pay_user_commissions function
-- =====================================================
CREATE OR REPLACE FUNCTION pay_user_commissions(
    p_user_id uuid,
    p_cutoff timestamptz,
    p_note text DEFAULT NULL
)
RETURNS TABLE(
    payout_id uuid,
    total_amount numeric,
    item_count integer
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_payout_id uuid;
    v_total_amount numeric;
    v_item_count integer;
    v_commission_ids uuid[];
BEGIN
    -- Get all pending commissions for this user up to cutoff date
    SELECT 
        array_agg(id),
        COALESCE(SUM(commission_amount), 0),
        COUNT(*)
    INTO 
        v_commission_ids,
        v_total_amount,
        v_item_count
    FROM commissions
    WHERE user_id = p_user_id
        AND status = 'pending'
        AND created_at <= p_cutoff;

    -- If no pending commissions, return empty
    IF v_item_count = 0 OR v_total_amount = 0 THEN
        RETURN QUERY SELECT NULL::uuid, 0::numeric, 0::integer;
        RETURN;
    END IF;

    -- Create payout record
    INSERT INTO payouts (user_id, total_amount, item_count, note)
    VALUES (p_user_id, v_total_amount, v_item_count, p_note)
    RETURNING id INTO v_payout_id;

    -- Create payout items for each commission
    INSERT INTO payout_items (payout_id, commission_id, amount)
    SELECT v_payout_id, id, commission_amount
    FROM commissions
    WHERE id = ANY(v_commission_ids);

    -- Mark commissions as paid
    UPDATE commissions
    SET status = 'paid'
    WHERE id = ANY(v_commission_ids);

    -- Update user's e-wallet balance
    INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
    VALUES (p_user_id, 'e_wallet', v_total_amount, v_total_amount)
    ON CONFLICT (user_id, wallet_type) 
    DO UPDATE SET 
        balance = wallets.balance + EXCLUDED.balance,
        available_for_withdrawal = wallets.available_for_withdrawal + EXCLUDED.available_for_withdrawal,
        updated_at = now();

    -- Create transaction record
    INSERT INTO transactions (
        user_id, 
        transaction_type, 
        amount, 
        source_type, 
        source_name,
        source_id,
        description, 
        wallet_type
    )
    VALUES (
        p_user_id,
        'credit',
        v_total_amount,
        'commission_payout',
        'Commission Payment',
        v_payout_id,
        COALESCE(p_note, 'Commission payout for ' || v_item_count || ' commission(s)'),
        'e_wallet'
    );

    -- Return payout details
    RETURN QUERY SELECT v_payout_id, v_total_amount, v_item_count;
END;
$$;

-- Step 3: Create the get_genealogy_tree function
-- =====================================================
CREATE OR REPLACE FUNCTION get_genealogy_tree(
  user_id UUID, 
  max_levels INTEGER DEFAULT 7
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  email TEXT,
  phone TEXT,
  ibo_number TEXT,
  level INTEGER,
  sponsor_id UUID,
  status TEXT,
  personal_sales BIGINT,
  total_earnings NUMERIC,
  downline_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE genealogy AS (
    -- Base case: Start with the user
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.ibo_number,
      0 as level,
      u.sponsor_id,
      u.status::text,
      COALESCE(order_stats.personal_sales, 0) as personal_sales,
      COALESCE(commission_stats.total_earnings, 0) as total_earnings,
      COALESCE(downline_stats.count, 0) as downline_count
    FROM users u
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as personal_sales
      FROM orders
      WHERE status IN ('processing', 'shipped', 'delivered')
      GROUP BY user_id
    ) order_stats ON u.id = order_stats.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(commission_amount) as total_earnings
      FROM commissions
      WHERE status = 'paid'
      GROUP BY user_id
    ) commission_stats ON u.id = commission_stats.user_id
    LEFT JOIN (
      SELECT 
        sponsor_id,
        COUNT(*) as count
      FROM users
      WHERE sponsor_id IS NOT NULL
      GROUP BY sponsor_id
    ) downline_stats ON u.id = downline_stats.sponsor_id
    WHERE u.id = get_genealogy_tree.user_id
    
    UNION ALL
    
    -- Recursive case: Get all downline members
    SELECT 
      u.id,
      u.name,
      u.email,
      u.phone,
      u.ibo_number,
      g.level + 1,
      u.sponsor_id,
      u.status::text,
      COALESCE(order_stats.personal_sales, 0) as personal_sales,
      COALESCE(commission_stats.total_earnings, 0) as total_earnings,
      COALESCE(downline_stats.count, 0) as downline_count
    FROM users u
    JOIN genealogy g ON u.sponsor_id = g.id
    LEFT JOIN (
      SELECT 
        user_id,
        COUNT(*) as personal_sales
      FROM orders
      WHERE status IN ('processing', 'shipped', 'delivered')
      GROUP BY user_id
    ) order_stats ON u.id = order_stats.user_id
    LEFT JOIN (
      SELECT 
        user_id,
        SUM(commission_amount) as total_earnings
      FROM commissions
      WHERE status = 'paid'
      GROUP BY user_id
    ) commission_stats ON u.id = commission_stats.user_id
    LEFT JOIN (
      SELECT 
        sponsor_id,
        COUNT(*) as count
      FROM users
      WHERE sponsor_id IS NOT NULL
      GROUP BY sponsor_id
    ) downline_stats ON u.id = downline_stats.sponsor_id
    WHERE g.level < max_levels - 1
  )
  SELECT * FROM genealogy
  ORDER BY level, name;
END;
$$;

-- Step 4: Add unique constraint to wallets if missing
-- =====================================================
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'wallets_user_id_wallet_type_key'
    ) THEN
        -- Remove duplicates first
        DELETE FROM wallets a USING wallets b
        WHERE a.user_id = b.user_id 
            AND a.wallet_type = b.wallet_type 
            AND a.id < b.id;
        
        ALTER TABLE wallets ADD CONSTRAINT wallets_user_id_wallet_type_key UNIQUE (user_id, wallet_type);
    END IF;
END $$;

-- Step 5: Initialize wallets for existing users who don't have them
-- =====================================================
INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
SELECT u.id, 'e_wallet', 0, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w 
    WHERE w.user_id = u.id AND w.wallet_type = 'e_wallet'
)
ON CONFLICT (user_id, wallet_type) DO NOTHING;

INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
SELECT u.id, 'payment_wallet', 0, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM wallets w 
    WHERE w.user_id = u.id AND w.wallet_type = 'payment_wallet'
)
ON CONFLICT (user_id, wallet_type) DO NOTHING;

-- Step 6: Initialize business_value for existing users (3 levels each)
-- =====================================================
INSERT INTO business_value (user_id, level, total_bv)
SELECT u.id, 1, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM business_value bv 
    WHERE bv.user_id = u.id AND bv.level = 1
);

INSERT INTO business_value (user_id, level, total_bv)
SELECT u.id, 2, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM business_value bv 
    WHERE bv.user_id = u.id AND bv.level = 2
);

INSERT INTO business_value (user_id, level, total_bv)
SELECT u.id, 3, 0
FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM business_value bv 
    WHERE bv.user_id = u.id AND bv.level = 3
);

-- Step 7: Recreate or create income_breakdown view if needed
-- =====================================================
CREATE OR REPLACE VIEW income_breakdown AS
SELECT 
    u.id as user_id,
    COALESCE(SUM(CASE WHEN c.commission_type = 'referral' AND c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as referral_income,
    COALESCE(SUM(CASE WHEN c.commission_type = 'repurchase' AND c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as repurchase_income,
    COALESCE(SUM(CASE WHEN c.commission_type = 'maintenance' AND c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as maintenance_income,
    COALESCE(SUM(CASE WHEN c.commission_type = 'rank_bonus' AND c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as rank_bonus_income,
    COALESCE(SUM(CASE WHEN c.commission_type = 'salary' AND c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as salary_income,
    COALESCE(SUM(CASE WHEN c.status = 'paid' THEN c.commission_amount ELSE 0 END), 0) as total_income
FROM users u
LEFT JOIN commissions c ON c.user_id = u.id
GROUP BY u.id;

-- Step 8: Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION pay_user_commissions TO authenticated;
GRANT EXECUTE ON FUNCTION pay_user_commissions TO service_role;
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO authenticated;
GRANT EXECUTE ON FUNCTION get_genealogy_tree TO service_role;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check functions exist
SELECT 'Function pay_user_commissions: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'pay_user_commissions'
    ) THEN 'YES ✓' ELSE 'NO ✗' END as status;

SELECT 'Function get_genealogy_tree: ' || 
    CASE WHEN EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public' AND p.proname = 'get_genealogy_tree'
    ) THEN 'YES ✓' ELSE 'NO ✗' END as status;

-- Check wallets
SELECT 'Users with e_wallet: ' || COUNT(*) || ' ✓' as status FROM wallets WHERE wallet_type = 'e_wallet';
SELECT 'Users with payment_wallet: ' || COUNT(*) || ' ✓' as status FROM wallets WHERE wallet_type = 'payment_wallet';

-- Check income_breakdown view
SELECT 'Users in income_breakdown: ' || COUNT(*) || ' ✓' as status FROM income_breakdown;

-- Check business_value
SELECT 'Business value entries: ' || COUNT(*) || ' ✓' as status FROM business_value;

-- Final summary
SELECT '🎉 SETUP COMPLETE! All ' || COUNT(*) || ' users ready!' as message FROM users;
