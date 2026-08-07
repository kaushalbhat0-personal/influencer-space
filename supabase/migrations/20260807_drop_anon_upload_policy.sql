-- RCCF-LAUNCH-01: remove the anon (unauthenticated) INSERT policy on the public
-- `influencer-images` bucket.
--
-- Why: the upload flow uses server-side signed URLs created with the
-- service-role client (which bypasses RLS), so this policy is vestigial — while
-- still allowing anyone on the internet to upload arbitrary files (≤5MB,
-- mime-whitelisted) to the public bucket with no path/ownership check. Public
-- READ stays (public URLs require it).
--
-- Apply in Supabase Dashboard → SQL Editor (or `supabase db push`).

BEGIN;

DROP POLICY IF EXISTS "Allow Uploads via Anon Key" ON storage.objects;

COMMIT;
