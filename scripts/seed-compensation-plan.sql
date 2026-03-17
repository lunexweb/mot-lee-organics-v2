-- Mot-lee Organics MLM Compensation Plan
-- Run this in your Supabase SQL editor to set up the correct ranks

-- Clear existing ranks
DELETE FROM ranks;

-- Insert all ranks with correct compensation plan
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

-- 1. Team Member
(
  'Team Member',
  1,
  6000.00,
  600.00,
  0,
  0.00,
  0.00,
  '{"1": 20}',
  'Entry level rank for new IBOs',
  'Team sales of R6,000.00 | Personal sales of R600.00',
  true
),

-- 2. Supervisor
(
  'Supervisor',
  2,
  12000.00,
  1200.00,
  0,
  0.00,
  1500.00,
  '{"1": 20}',
  'First promotion rank with rank-up bonus',
  'Team sales of R12,000.00 | Personal sales of R1,200.00 | Rank up bonus: R1,500.00',
  true
),

-- 3. Manager
(
  'Manager',
  3,
  60000.00,
  2400.00,
  5,
  0.00,
  5000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5}',
  'Mid-level rank with multi-level commissions',
  'Team sales target: R60,000.00 (Levels 1,2,3,4) | Personal sales: R2,400.00 | Minimum 5 active members on level | Rank up bonus: R5,000.00',
  true
),

-- 4. Senior Manager
(
  'Senior Manager',
  4,
  200000.00,
  0.00,
  6,
  20000.00,
  25000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1}',
  'Senior rank with salary and deep level commissions',
  'Team sales target: R200,000.00 (Levels 1-6 combined) | Minimum 6 active members on levels 1 and 2 | Salary: R20,000.00 | Rank up bonus: R25,000.00',
  true
),

-- 5. Director
(
  'Director',
  5,
  550000.00,
  0.00,
  0,
  0.00,
  50000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1, "7": 0.5}',
  'Director rank with 7-level commissions',
  'Team sales: R550,000.00 (Levels 4,5,6,7 combined) | Rank up bonus: R50,000.00',
  true
),

-- 6. Senior Director
(
  'Senior Director',
  6,
  1100000.00,
  6000.00,
  0,
  60000.00,
  1100000.00,
  '{"1": 20, "2": 10, "3": 8, "4": 5, "5": 2, "6": 1, "7": 1}',
  'Top rank with highest salary and rank-up bonus',
  'Team sales target: R1,100,000.00 | Personal sales target: R6,000.00 | Salary: R60,000.00 | Rank up bonus: R1,100,000.00',
  true
);

-- Verify
SELECT name, level_order, team_sales_target, personal_sales_target, salary, rank_bonus, commission_levels
FROM ranks
ORDER BY level_order;
