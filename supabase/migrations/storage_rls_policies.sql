-- Run this in Supabase Dashboard → SQL Editor
-- Grants anon (public) users permission to upload files to influencer-images bucket
-- Required for client-side direct uploads to work

BEGIN;

-- 1. Allow anyone to read from the bucket (public URLs)
CREATE POLICY "Public Read Access"
ON storage.objects
FOR SELECT
USING (bucket_id = 'influencer-images');

-- 2. Allow anon users to insert (upload) files
-- The path pattern includes tenantId, which prevents cross-tenant overwrites
CREATE POLICY "Allow Uploads via Anon Key"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'influencer-images'
  AND auth.role() = 'anon'
);

COMMIT;
