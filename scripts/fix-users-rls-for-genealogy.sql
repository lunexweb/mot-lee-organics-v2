-- ============================================================================
-- FIX: Allow all authenticated users to see all other users
-- This is required for:
-- - Genealogy tree (seeing downline members)
-- - Dashboard team count
-- - Referral links
-- SAFE TO RUN: No data deleted, only adds a SELECT policy
-- ============================================================================

-- Allow ALL authenticated users to read ALL user profiles
-- (needed for genealogy tree, team stats, referral lookups)
DROP POLICY IF EXISTS "users.authenticated.select_all" ON public.users;

CREATE POLICY "users.authenticated.select_all"
ON public.users
FOR SELECT
USING (auth.role() = 'authenticated');

-- Verify the policy was created
SELECT 
    policyname,
    cmd,
    roles,
    qual
FROM pg_policies 
WHERE tablename = 'users'
ORDER BY policyname;

SELECT '✓ Users RLS fixed! All authenticated users can now see all users.' as status;
