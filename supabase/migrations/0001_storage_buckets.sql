-- ============================================================================
-- Migration: 0001 - Storage Buckets
-- Description: Creates the `influencer-images` bucket for admin image uploads.
--
-- Architecture:
--   Bucket: influencer-images (public)
--     ├── products/     ← Product images
--     ├── affiliates/   ← Affiliate link images
--     ├── settings/     ← Profile / brand images
--     └── general/      ─ Fallback for other uploads
--
-- RLS Policies (set via Supabase Dashboard → Storage → Policies):
--   SELECT: Everyone (public read)
--   INSERT: Authenticated users only
--   UPDATE: Row-level - owner only
--   DELETE: Row-level - owner only
-- ============================================================================

-- 1. Create bucket (idempotent)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
select
  'influencer-images',
  'influencer-images',
  true,
  5242880,  -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
where not exists (
  select 1 from storage.buckets where id = 'influencer-images'
);

-- ============================================================================
-- After running this SQL, go to Supabase Dashboard:
--   Storage → influencer-images → Policies → Add policies
--
-- Enable these 4 policies via the visual editor:
--   1. "Public Read"       → SELECT  → using: bucket_id = 'influencer-images'
--   2. "Authenticated Upload" → INSERT → with check: bucket_id = 'influencer-images' AND auth.role() = 'authenticated'
--   3. "Owner Update"        → UPDATE → using: bucket_id = 'influencer-images' AND auth.uid() = owner
--   4. "Owner Delete"        → DELETE → using: bucket_id = 'influencer-images' AND auth.uid() = owner
--
-- The Dashboard handles permissions correctly without needing table ownership.
-- ============================================================================
