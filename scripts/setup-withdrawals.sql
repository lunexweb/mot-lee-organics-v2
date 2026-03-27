-- ============================================================
-- WITHDRAWAL SYSTEM SETUP  (safe to re-run — fully idempotent)
-- Run this in your Supabase SQL editor
-- ============================================================

-- =====================
-- 1. SCHEMA
-- =====================

-- 1a. Withdrawals table
CREATE TABLE IF NOT EXISTS withdrawals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  fee DECIMAL(10,2) NOT NULL,
  net_amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  ibo_number TEXT,
  bank_name TEXT,
  bank_account_number TEXT,
  bank_account_holder TEXT,
  branch_code TEXT,
  admin_note TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Ensure columns exist (safe if table already existed)
ALTER TABLE withdrawals ADD COLUMN IF NOT EXISTS ibo_number TEXT;

-- 1c. Status constraint: pending → approved → paid | rejected
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_status_check;
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_status_check
  CHECK (status IN ('pending', 'approved', 'paid', 'rejected'));

-- 1d. Wallet columns for withdrawal tracking
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS available_for_withdrawal DECIMAL(10,2) DEFAULT 0;
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS total_withdrawn DECIMAL(10,2) DEFAULT 0;

-- =====================
-- 2. RLS POLICIES
-- =====================

-- 2a. Withdrawals table
ALTER TABLE withdrawals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own withdrawals" ON withdrawals;
CREATE POLICY "Users can view own withdrawals" ON withdrawals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own withdrawals" ON withdrawals;
CREATE POLICY "Users can insert own withdrawals" ON withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins full access on withdrawals" ON withdrawals;
CREATE POLICY "Admins full access on withdrawals" ON withdrawals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 2b. Wallets table — members can UPDATE own wallet (lock funds at request time)
DROP POLICY IF EXISTS "Users can update own wallet" ON wallets;
CREATE POLICY "Users can update own wallet" ON wallets
  FOR UPDATE USING (auth.uid() = user_id);

-- 2c. Wallets table — admins can SELECT + UPDATE any wallet (deduct on payment)
DROP POLICY IF EXISTS "Admins can view any wallet" ON wallets;
CREATE POLICY "Admins can view any wallet" ON wallets
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Admins can update any wallet" ON wallets;
CREATE POLICY "Admins can update any wallet" ON wallets
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================
-- 3. INDEXES
-- =====================
CREATE INDEX IF NOT EXISTS idx_withdrawals_user_id ON withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_withdrawals_created_at ON withdrawals(created_at DESC);

-- =====================
-- 4. REAL-TIME
-- =====================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'wallets'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE wallets;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'withdrawals'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE withdrawals;
  END IF;
END $$;

-- =====================
-- 5. SYNC ALL WALLET BALANCES (recalculate from source-of-truth)
--    - commissions table  → what was earned
--    - withdrawals table  → what was withdrawn / locked
--    Safe to run repeatedly — always produces the correct result.
-- =====================
WITH
  -- Total commissions credited (paid status = money is in wallet)
  earned AS (
    SELECT user_id, COALESCE(SUM(commission_amount), 0) AS total
    FROM commissions
    WHERE status = 'paid'
    GROUP BY user_id
  ),
  -- Total paid withdrawals (money already left wallet)
  withdrawn AS (
    SELECT user_id, COALESCE(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE status = 'paid'
    GROUP BY user_id
  ),
  -- Locked funds (pending or approved withdrawals — money reserved, not yet paid out)
  locked AS (
    SELECT user_id, COALESCE(SUM(amount), 0) AS total
    FROM withdrawals
    WHERE status IN ('pending', 'approved')
    GROUP BY user_id
  )
UPDATE wallets w
SET
  balance            = COALESCE(e.total, 0) - COALESCE(p.total, 0),
  available_for_withdrawal = COALESCE(e.total, 0) - COALESCE(p.total, 0) - COALESCE(l.total, 0),
  total_withdrawn    = COALESCE(p.total, 0),
  updated_at         = NOW()
FROM earned e
LEFT JOIN withdrawn p ON p.user_id = e.user_id
LEFT JOIN locked l    ON l.user_id = e.user_id
WHERE w.user_id = e.user_id
  AND w.wallet_type = 'e_wallet';
