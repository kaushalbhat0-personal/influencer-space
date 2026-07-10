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
-- ============================================================================

-- 1. Create bucket (idempotent)
do $$
begin
  if not exists (
    select 1 from storage.buckets where id = 'influencer-images'
  ) then
    insert into storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
    values (
      'influencer-images',
      'influencer-images',
      true,                -- public bucket (no token needed for read)
      false,               -- no avif autodetection
      5 * 1024 * 1024,     -- 5 MB file size limit
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
    );
  end if;
end $$;

-- 2. Enable RLS on the objects table for this bucket
alter table storage.objects enable row level security;

-- 3. Drop existing policies to make this re-runnable
drop policy if exists "Public Read - influencer-images" on storage.objects;
drop policy if exists "Authenticated Insert - influencer-images" on storage.objects;
drop policy if exists "Owner Update - influencer-images" on storage.objects;
drop policy if exists "Owner Delete - influencer-images" on storage.objects;

-- 4. Policy: Public read access (anyone can view images)
create policy "Public Read - influencer-images"
  on storage.objects
  for select
  using (bucket_id = 'influencer-images');

-- 5. Policy: Authenticated users can upload (admin panel)
create policy "Authenticated Insert - influencer-images"
  on storage.objects
  for insert
  with check (
    bucket_id = 'influencer-images'
    and auth.role() = 'authenticated'
  );

-- 6. Policy: Uploader can update their own files
create policy "Owner Update - influencer-images"
  on storage.objects
  for update
  using (
    bucket_id = 'influencer-images'
    and auth.uid() = owner
  );

-- 7. Policy: Uploader can delete their own files
create policy "Owner Delete - influencer-images"
  on storage.objects
  for delete
  using (
    bucket_id = 'influencer-images'
    and auth.uid() = owner
  );

-- ============================================================================
-- Usage:
--   Run this in Supabase SQL Editor (Dashboard → SQL Editor).
--   The bucket will appear in Supabase Dashboard → Storage.
--   
--   Folders are created automatically on first upload to a path, e.g.:
--     supabaseClient.storage.from('influencer-images').upload('products/abc.jpg', file)
-- ============================================================================
