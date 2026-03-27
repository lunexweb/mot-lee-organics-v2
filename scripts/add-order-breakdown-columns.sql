-- ============================================================================
-- ADD TAX AND SHIPPING COLUMNS TO ORDERS TABLE
-- Run this in Supabase SQL Editor to add breakdown columns
-- ============================================================================

-- Add subtotal column (cost before tax and shipping)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2);

-- Add tax_amount column (15% tax)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10, 2);

-- Add shipping_amount column (calculated based on province)
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10, 2);

-- Add comments for documentation
COMMENT ON COLUMN public.orders.subtotal IS 'Order subtotal before tax and shipping';
COMMENT ON COLUMN public.orders.tax_amount IS 'Tax amount (15%)';
COMMENT ON COLUMN public.orders.shipping_amount IS 'Shipping cost (R99.99 for Gauteng, R149.00 for others)';

-- ============================================================================
-- DONE! Now orders can store subtotal, tax, and shipping breakdown
-- ============================================================================

