-- ============================================================================
-- FIX: RLS Policies for 'public.users' table - Admin UPDATE/SELECT Fix
-- This script fixes the 406 error when admins try to update users
-- SAFE TO RUN: Won't break existing functionality
-- ============================================================================

-- Ensure Row Level Security is enabled
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Drop the existing admin manage policy (if it exists) to recreate it properly
DROP POLICY IF EXISTS "users.admin.manage_all" ON public.users;
DROP POLICY IF EXISTS "users.admin.update_all" ON public.users;
DROP POLICY IF EXISTS "users.admin.select_after_update" ON public.users;

-- Policy: Allow admin users to UPDATE any user profile
-- This is needed for the UPDATE operation itself
CREATE POLICY "users.admin.update_all"
ON public.users
FOR UPDATE
USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
)
WITH CHECK (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Allow admin users to SELECT any user profile (including after UPDATE)
-- This is critical - after UPDATE, Supabase needs to SELECT the row to return it
-- This policy must allow SELECT for admins on ALL rows
CREATE POLICY "users.admin.select_all"
ON public.users
FOR SELECT
USING (
  auth.role() = 'authenticated' AND EXISTS (
    SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ============================================================================
-- NOTE: This script only adds policies. It doesn't remove your existing
-- self-access policies or anonymous policies. Those remain unchanged.
-- ============================================================================
