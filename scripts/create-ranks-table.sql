-- Create ranks table for MLM compensation plan
CREATE TABLE IF NOT EXISTS ranks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  level_order INTEGER NOT NULL UNIQUE,
  team_sales_target DECIMAL(12, 2) DEFAULT 0,
  personal_sales_target DECIMAL(12, 2) DEFAULT 0,
  min_active_members INTEGER DEFAULT 0,
  salary DECIMAL(12, 2) DEFAULT 0,
  rank_bonus DECIMAL(12, 2) DEFAULT 0,
  commission_levels JSONB DEFAULT '{}',
  description TEXT,
  requirements TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for ordering
CREATE INDEX IF NOT EXISTS idx_ranks_level_order ON ranks(level_order);
CREATE INDEX IF NOT EXISTS idx_ranks_is_active ON ranks(is_active);

-- Enable RLS
ALTER TABLE ranks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Admin users can do everything
CREATE POLICY "Admins can manage ranks" ON ranks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- All authenticated users can read active ranks
CREATE POLICY "Authenticated users can read ranks" ON ranks
  FOR SELECT USING (
    is_active = true
  );

-- Public (unauthenticated) users can read active ranks for recruitment
CREATE POLICY "Public can read active ranks" ON ranks
  FOR SELECT USING (
    is_active = true AND auth.uid() IS NULL
  );

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_ranks_updated_at 
  BEFORE UPDATE ON ranks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();
