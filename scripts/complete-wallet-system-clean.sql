-- Clean Wallet & Dashboard Enhancement for Mot-Lee Organics
-- RUN THIS AFTER PREVIOUS ATTEMPT - Handles existing objects
-- This completes the missing features from True Organics dashboard

-- =====================================================
-- 1. DROP EXISTING POLICIES (to recreate them cleanly)
-- =====================================================
DROP POLICY IF EXISTS "Users can view own wallets" ON wallets;
DROP POLICY IF EXISTS "Admins can view all wallets" ON wallets;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own BV" ON business_value;
DROP POLICY IF EXISTS "Admins can view all BV" ON business_value;

-- =====================================================
-- 2. ENSURE COMMISSION_TYPE COLUMN EXISTS
-- =====================================================
ALTER TABLE commissions 
ADD COLUMN IF NOT EXISTS commission_type TEXT DEFAULT 'referral';

-- Update existing commissions to have proper types based on level
UPDATE commissions 
SET commission_type = CASE 
  WHEN level = 1 THEN 'referral'
  WHEN level = 2 THEN 'repurchase' 
  WHEN level = 3 THEN 'maintenance'
  ELSE 'referral'
END 
WHERE commission_type IS NULL OR commission_type = '';

-- =====================================================
-- 3. ENSURE ALL TABLES EXIST
-- =====================================================
CREATE TABLE IF NOT EXISTS wallets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('e_wallet', 'payment_wallet')),
  balance DECIMAL(12, 2) DEFAULT 0.00,
  available_for_withdrawal DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, wallet_type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit', 'debit')),
  amount DECIMAL(12, 2) NOT NULL,
  source_type TEXT NOT NULL,
  source_name TEXT,
  source_id UUID,
  description TEXT,
  status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'failed')),
  wallet_type TEXT NOT NULL CHECK (wallet_type IN ('e_wallet', 'payment_wallet')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS business_value (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  level INTEGER NOT NULL CHECK (level >= 1 AND level <= 7),
  total_bv DECIMAL(12, 2) DEFAULT 0.00,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, level)
);

-- =====================================================
-- 4. RECREATE INCOME BREAKDOWN VIEW
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

-- =====================================================
-- 5. ENSURE INDEXES EXIST
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallets_type ON wallets(wallet_type);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_bv_user_id ON business_value(user_id);
CREATE INDEX IF NOT EXISTS idx_bv_level ON business_value(level);
CREATE INDEX IF NOT EXISTS idx_commissions_type ON commissions(commission_type);

-- =====================================================
-- 6. ENABLE RLS AND RECREATE POLICIES
-- =====================================================
ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_value ENABLE ROW LEVEL SECURITY;

-- Wallet policies
CREATE POLICY "Users can view own wallets" ON wallets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all wallets" ON wallets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Transaction policies
CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all transactions" ON transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- BV policies
CREATE POLICY "Users can view own BV" ON business_value
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Admins can view all BV" ON business_value
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- =====================================================
-- 7. ENSURE FUNCTIONS EXIST
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers (if they don't exist)
DROP TRIGGER IF EXISTS update_wallets_updated_at ON wallets;
CREATE TRIGGER update_wallets_updated_at 
  BEFORE UPDATE ON wallets 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions;
CREATE TRIGGER update_transactions_updated_at 
  BEFORE UPDATE ON transactions 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bv_updated_at ON business_value;
CREATE TRIGGER update_bv_updated_at 
  BEFORE UPDATE ON business_value 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 8. WALLET MANAGEMENT FUNCTIONS
-- =====================================================
CREATE OR REPLACE FUNCTION add_to_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_wallet_type TEXT,
  p_source_type TEXT,
  p_source_name TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  -- Update or insert wallet balance
  INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
  VALUES (p_user_id, p_wallet_type, p_amount, p_amount)
  ON CONFLICT (user_id, wallet_type) 
  DO UPDATE SET 
    balance = wallets.balance + p_amount,
    available_for_withdrawal = CASE 
      WHEN p_wallet_type = 'e_wallet' 
      THEN wallets.available_for_withdrawal + p_amount
      ELSE wallets.available_for_withdrawal
    END;
  
  -- Record transaction
  INSERT INTO transactions (
    user_id, transaction_type, amount, source_type, source_name, 
    description, wallet_type
  ) VALUES (
    p_user_id, 'credit', p_amount, p_source_type, p_source_name, 
    p_description, p_wallet_type
  );
  
  RETURN TRUE;
END;
$$;

CREATE OR REPLACE FUNCTION withdraw_from_wallet(
  p_user_id UUID,
  p_amount DECIMAL,
  p_description TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  current_balance DECIMAL;
BEGIN
  -- Get current e-wallet balance
  SELECT balance INTO current_balance
  FROM wallets 
  WHERE user_id = p_user_id AND wallet_type = 'e_wallet';
  
  -- Check sufficient balance
  IF current_balance < p_amount THEN
    RETURN FALSE;
  END IF;
  
  -- Update wallet
  UPDATE wallets 
  SET 
    balance = balance - p_amount,
    available_for_withdrawal = available_for_withdrawal - p_amount
  WHERE user_id = p_user_id AND wallet_type = 'e_wallet';
  
  -- Record transaction
  INSERT INTO transactions (
    user_id, transaction_type, amount, source_type, 
    description, wallet_type
  ) VALUES (
    p_user_id, 'debit', p_amount, 'withdrawal', 
    p_description, 'e_wallet'
  );
  
  RETURN TRUE;
END;
$$;

-- =====================================================
-- 9. INITIALIZE WALLETS FOR EXISTING USERS
-- =====================================================
INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
SELECT 
  id, 
  'e_wallet', 
  0.00, 
  0.00
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM wallets w 
  WHERE w.user_id = users.id AND w.wallet_type = 'e_wallet'
);

INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
SELECT 
  id, 
  'payment_wallet', 
  0.00, 
  0.00
FROM users
WHERE NOT EXISTS (
  SELECT 1 FROM wallets w 
  WHERE w.user_id = users.id AND w.wallet_type = 'payment_wallet'
);

-- =====================================================
-- 10. GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON wallets TO authenticated;
GRANT ALL ON wallets TO service_role;
GRANT ALL ON transactions TO authenticated;
GRANT ALL ON transactions TO service_role;
GRANT ALL ON business_value TO authenticated;
GRANT ALL ON business_value TO service_role;
GRANT ALL ON income_breakdown TO authenticated;
GRANT ALL ON income_breakdown TO service_role;

GRANT EXECUTE ON FUNCTION add_to_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION add_to_wallet TO service_role;
GRANT EXECUTE ON FUNCTION withdraw_from_wallet TO authenticated;
GRANT EXECUTE ON FUNCTION withdraw_from_wallet TO service_role;

SELECT 'Wallet & Dashboard Enhancement completed successfully!' as result;
SELECT 'Features added: E-Wallet, Payment Wallet, Transactions, BV Tracking, Income Breakdown' as features;
