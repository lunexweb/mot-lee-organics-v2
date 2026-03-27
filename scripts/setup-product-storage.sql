-- ============================================================================
-- PRODUCT IMAGE STORAGE SETUP FOR MOT-LEE ORGANICS
-- Copy and paste this entire script into your Supabase SQL Editor
-- ============================================================================

-- NOTE: Storage buckets cannot be created via SQL
-- You MUST create the 'products' bucket manually in Supabase Dashboard:
--   1. Go to Storage → Create Bucket
--   2. Name: "products"
--   3. Public: YES (check this box)
--   4. Click "Create bucket"

-- After creating the bucket, run the RLS policies below:

-- ============================================================================
-- STORAGE BUCKET RLS POLICIES
-- ============================================================================

-- Policy 1: Allow authenticated users (admins) to upload images
CREATE POLICY IF NOT EXISTS "Allow authenticated uploads"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = 'products'
);

-- Policy 2: Allow authenticated users to update their uploads
CREATE POLICY IF NOT EXISTS "Allow authenticated updates"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = 'products'
)
WITH CHECK (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = 'products'
);

-- Policy 3: Allow authenticated users to delete their uploads
CREATE POLICY IF NOT EXISTS "Allow authenticated deletes"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'products' AND
  (storage.foldername(name))[1] = 'products'
);

-- Policy 4: Allow public (anonymous) read access to product images
CREATE POLICY IF NOT EXISTS "Public product image access"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'products'
);

-- ============================================================================
-- ALTERNATIVE: If the above policies don't work, use these simpler ones:
-- ============================================================================

-- Simple policy: Admins can do everything
-- DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated updates" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
-- DROP POLICY IF EXISTS "Public product image access" ON storage.objects;

-- CREATE POLICY "Admin full access to products bucket"
-- ON storage.objects
-- FOR ALL
-- TO authenticated
-- USING (bucket_id = 'products')
-- WITH CHECK (bucket_id = 'products');

-- CREATE POLICY "Public read access to products"
-- ON storage.objects
-- FOR SELECT
-- TO public
-- USING (bucket_id = 'products');

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check if policies were created:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- ============================================================================
-- MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD:
-- ============================================================================
-- 1. Go to: Storage → Create Bucket
-- 2. Name: "products"
-- 3. Public: YES (enable public access)
-- 4. File size limit: 5242880 (5MB)
-- 5. Allowed MIME types: image/* (optional, but recommended)
-- 6. Click "Create bucket"
-- ============================================================================

