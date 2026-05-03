-- Complete MLM Ranks Setup - Run this once in Supabase SQL Editor

-- Create ranks table
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

-- Create indexes
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

-- Auto-update timestamp function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-updating updated_at
CREATE TRIGGER update_ranks_updated_at 
  BEFORE UPDATE ON ranks 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Insert all rank data with your compensation structure
INSERT INTO ranks (
  name, 
  level_order, 
  team_sales_target, 
  personal_sales_target, 
  min_active_members, 
  salary, 
  rank_bonus, 
  commission_levels,
  description,
  requirements,
  is_active
) VALUES 
-- Team Member
(
  'Team Member',
  1,
  6000.00,
  600.00,
  0,
  0.00,
  0.00,
  '{"1": 20}',
  'Entry level position for new distributors',
  'Team sales of R6,000.00 and personal sales of R600.00',
  true
),

-- Supervisor
(
  'Supervisor',
  2,
  12000.00,
  1200.00,
  0,
  0.00,
  1500.00,
  '{"1": 20}',
  'First leadership level with team management responsibilities',
  'Team sales of R12,000.00 and personal sales of R1,200.00',
  true
),

-- Manager
(
  'Manager',
  3,
  60000.00,
  2400.00,
  5,
  0.00,
  5000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5}',
  'Mid-level management with expanded commission structure',
  'Team sales of R60,000.00 (Levels 1-4), personal sales of R2,400.00, minimum of 5 active members',
  true
),

-- Senior Manager
(
  'Senior Manager',
  4,
  200000.00,
  0.00,
  6,
  20000.00,
  25000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1}',
  'Senior leadership with salary and deeper commission levels',
  'Team sales of R200,000.00 (Levels 1-6), minimum of 6 active members on levels 1-2',
  true
),

-- Director
(
  'Director',
  5,
  550000.00,
  0.00,
  0,
  0.00,
  50000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1, "7": 0.5}',
  'Executive level with 7-tier commission structure',
  'Team sales of R550,000.00 (Levels 4-7 combined)',
  true
),

-- Senior Director
(
  'Senior Director',
  6,
  1100000.00,
  6000.00,
  0,
  60000.00,
  1100000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1, "7": 1}',
  'Highest leadership level with maximum earning potential',
  'Team sales of R1,100,000.00, personal sales of R6,000.00',
  true
)
ON CONFLICT (level_order) DO UPDATE SET
  name = EXCLUDED.name,
  team_sales_target = EXCLUDED.team_sales_target,
  personal_sales_target = EXCLUDED.personal_sales_target,
  min_active_members = EXCLUDED.min_active_members,
  salary = EXCLUDED.salary,
  rank_bonus = EXCLUDED.rank_bonus,
  commission_levels = EXCLUDED.commission_levels,
  description = EXCLUDED.description,
  requirements = EXCLUDED.requirements,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Success message
SELECT 'MLM Ranks table created and populated successfully!' as result;
