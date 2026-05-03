-- Test Data for Dashboard Verification
-- Run this to populate sample data and test the dashboard

-- =====================================================
-- 1. ADD SAMPLE TRANSACTIONS FOR CURRENT USER
-- =====================================================

-- Get the current user ID (replace with actual user ID from your users table)
-- For testing, let's add some sample transactions for user 'herry-maswangany-IBO-N8P5RAKR'

-- First, let's find your user ID
SELECT id, name, ibo_number FROM users WHERE ibo_number = 'IBO-N8P5RAKR';

-- Add sample transactions (run after you get your user ID)
-- Replace 'YOUR_USER_ID' with the actual ID from above

-- Sample commission credits
INSERT INTO transactions (
  user_id, 
  transaction_type, 
  amount, 
  source_type, 
  source_name, 
  description, 
  wallet_type
) VALUES 
  -- Replace 'YOUR_USER_ID' with actual user ID
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Kagiso79', '10% Maintenance bonus received from Kagiso79(TO84688437438) of level1 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Kagiso79', '10% Maintenance bonus received from Kagiso79(TO84688437438) of level1 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Jothum06', '10% Referral bonus received from Jothum06(TO25373472602) of level2 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Rivanda21', '10% Maintenance bonus received from Rivanda21(TO90445117406) of level1 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'debit', 240.00, 'withdrawal', NULL, 'Withdrawal Request amount', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Pfuxi2014', '10% Repurchase bonus received from Pfuxi2014(TO74404518103) of level2 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 500.00, 'rank_bonus', 'Progress Zone', '500 amount received from Progress Zone Rank', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Lughile1', '10% Referral bonus received from Lughile1(TO12496504556) of level3 of order amount 600', 'e_wallet'),
  ('YOUR_USER_ID', 'credit', 60.00, 'commission', 'Mashudu@1989', '10% Maintenance bonus received from Mashudu@1989(TO93838323568) of level1 of order amount 600', 'e_wallet');

-- Update wallet balances
INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
VALUES ('YOUR_USER_ID', 'e_wallet', 1000.00, 760.00)
ON CONFLICT (user_id, wallet_type) 
DO UPDATE SET 
  balance = 1000.00,
  available_for_withdrawal = 760.00;

INSERT INTO wallets (user_id, wallet_type, balance, available_for_withdrawal)
VALUES ('YOUR_USER_ID', 'payment_wallet', 500.00, 0.00)
ON CONFLICT (user_id, wallet_type) 
DO UPDATE SET 
  balance = 500.00,
  available_for_withdrawal = 0.00;

-- Add sample business value
INSERT INTO business_value (user_id, level, total_bv)
VALUES 
  ('YOUR_USER_ID', 1, 1000),
  ('YOUR_USER_ID', 2, 400),
  ('YOUR_USER_ID', 3, 100)
ON CONFLICT (user_id, level) 
DO UPDATE SET 
  total_bv = EXCLUDED.total_bv;

-- =====================================================
-- 2. UPDATE SAMPLE COMMISSIONS WITH TYPES
-- =====================================================

-- If you have existing commissions, update them with proper types
UPDATE commissions 
SET commission_type = 'maintenance'
WHERE commission_type IS NULL OR commission_type = '';

SELECT 'Test data added successfully!' as result;
SELECT 'Replace YOUR_USER_ID with your actual user ID from the first query' as note;
