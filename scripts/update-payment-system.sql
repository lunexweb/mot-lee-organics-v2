-- Update Payment System for IBO-Based Bank Transfers
-- Run this in Supabase SQL Editor

-- Add payment status to orders table
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending_payment';

-- Update existing orders to have payment status
UPDATE orders 
SET payment_status = 'pending_payment' 
WHERE payment_status IS NULL OR payment_status = '';

-- Create payment confirmation function
CREATE OR REPLACE FUNCTION confirm_payment(
  p_order_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  order_user_id UUID;
  order_amount DECIMAL;
BEGIN
  -- Get order details
  SELECT user_id, total_amount INTO order_user_id, order_amount
  FROM orders 
  WHERE id = p_order_id AND payment_status = 'pending_payment';
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  -- Update order status
  UPDATE orders 
  SET 
    payment_status = 'paid',
    status = 'processing'
  WHERE id = p_order_id;
  
  -- Trigger commission calculation (this should already exist)
  -- The existing commission calculation will trigger when status changes
  
  RETURN TRUE;
END;
$$;

-- Grant permission for payment confirmation
GRANT EXECUTE ON FUNCTION confirm_payment TO authenticated;
GRANT EXECUTE ON FUNCTION confirm_payment TO service_role;

-- Add bank details configuration table
CREATE TABLE IF NOT EXISTS bank_details (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  account_name TEXT NOT NULL,
  account_number TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  branch_code TEXT,
  account_type TEXT DEFAULT 'cheque',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default bank details
INSERT INTO bank_details (
  account_name,
  account_number,
  bank_name,
  branch_code,
  account_type
) VALUES (
  'Mot-Lee Organics',
  '1234567890',
  'Standard Bank',
  '051001',
  'Business Account'
) ON CONFLICT DO NOTHING;

-- Enable RLS for bank details
ALTER TABLE bank_details ENABLE ROW LEVEL SECURITY;

-- RLS policy for bank details (everyone can read, only admins can edit)
CREATE POLICY "Anyone can read bank details" ON bank_details
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage bank details" ON bank_details
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

SELECT 'Payment system updated for IBO-based bank transfers!' as result;
