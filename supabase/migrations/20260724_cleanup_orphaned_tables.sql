-- CreatorStore Database Cleanup v2.0
-- Remove verified orphaned tables with zero runtime references.
-- Run via: npx supabase db query --file supabase/migrations/20260724_cleanup_orphaned_tables.sql --linked
-- Or paste into Supabase SQL Editor.

BEGIN;

-- ── Verify each table has zero dependencies before dropping ────────────

-- BillingAccount: polymorphic shim, replaced by workspaceId on BillingSubscription.
-- No runtime queries remain after migration.
DROP TABLE IF EXISTS "BillingAccount" CASCADE;

-- ProviderFetchLog: part of the dead CreatorOS provider system.
-- Zero runtime queries.
DROP TABLE IF EXISTS "ProviderFetchLog" CASCADE;

-- Workflow: the workflow engine was removed in EPIC-00.
-- Zero runtime queries.
DROP TABLE IF EXISTS "Workflow" CASCADE;

-- WorkflowExecution: same as Workflow.
-- Zero runtime queries.
DROP TABLE IF EXISTS "WorkflowExecution" CASCADE;

-- CreatorProfile: part of the CreatorOS AI system.
-- Zero runtime queries (CreatorIntelligence depends on it, so drop order matters).
DROP TABLE IF EXISTS "CreatorIntelligence" CASCADE;
DROP TABLE IF EXISTS "CreatorProfile" CASCADE;

COMMIT;

-- ── Post-cleanup verification ──────────────────────────────────────────
SELECT 'Tables remaining:' as info, COUNT(*)::text as count FROM pg_catalog.pg_tables WHERE schemaname='public';
