-- ============================================================================
-- Migration: 0001 - Storage Buckets & Policies
-- Description: Creates the `influencer-images` bucket for admin image uploads
--              and applies fine-grained RLS policies.
-- 
-- Architecture:
--   Bucket: influencer-images
--     ├── products/     ← Product images
--     ├── affiliates/   ← Affiliate link images
--     ├── settings/     ← Profile / brand images
--     └── general/      ─ Fallback for other uploads
--
-- Policies:
--   SELECT: Anyone (public read)
--   INSERT: Only authenticated users (admin)
--   UPDATE: Only the uploader (owner)
--   DELETE: Only the uploader (owner)
--
-- Note: Uses security definer functions to bypass direct ownership
--       requirements on storage.objects.
-- ============================================================================

-- 1. Create bucket using Supabase's built-in API (works with service_role)
select storage.create_bucket(
  'influencer-images',
  jsonb_build_object(
    'public', true,
    'file_size_limit', 5242880,          -- 5 MB
    'allowed_mime_types', array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
  )
) where not exists (
  select 1 from storage.buckets where id = 'influencer-images'
);

-- 2. Create policies using a security definer function
--    (avoids "must be owner of table objects" error)
create or replace function storage.create_influencer_policies()
returns void
language plpgsql
security definer
set search_path = storage
as $$
begin
  -- Public read
  create policy "Public Read - influencer-images"
    on storage.objects for select
    using (bucket_id = 'influencer-images');

  -- Authenticated insert
  create policy "Authenticated Insert - influencer-images"
    on storage.objects for insert
    with check (
      bucket_id = 'influencer-images'
      and auth.role() = 'authenticated'
    );

  -- Owner update
  create policy "Owner Update - influencer-images"
    on storage.objects for update
    using (
      bucket_id = 'influencer-images'
      and auth.uid() = owner
    );

  -- Owner delete
  create policy "Owner Delete - influencer-images"
    on storage.objects for delete
    using (
      bucket_id = 'influencer-images'
      and auth.uid() = owner
    );
exception
  when duplicate_object then null;
end;
$$;

-- Run the function
select storage.create_influencer_policies();

-- Clean up the helper function (no longer needed)
drop function if exists storage.create_influencer_policies;

-- 3. Drop bucket function for cleanup (if needed)
create or replace function storage.drop_influencer_bucket()
returns void
language plpgsql
security definer
set search_path = storage
as $$
begin
  -- Delete all objects first
  delete from storage.objects where bucket_id = 'influencer-images';
  -- Delete the bucket
  delete from storage.buckets where id = 'influencer-images';
end;
$$;

-- ============================================================================
-- Usage:
--   1. Run this entire file in Supabase SQL Editor.
--   2. Verify: Dashboard → Storage → "influencer-images" bucket exists.
--   3. To teardown: select storage.drop_influencer_bucket();
--   
--   Folders are created automatically on first upload to a path:
--     supabaseClient.storage.from('influencer-images').upload('products/abc.jpg', file)
-- ============================================================================
