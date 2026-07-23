-- =============================================================================
-- CreatorStore — Production-Safe Data Cleanup
-- =============================================================================
-- Preserves:  Super Admin user(s), Theme registry, Billing plan catalog,
--              Billing feature definitions, Agency config (platform-level),
--              System-level Settings, Migration history
-- Deletes:    All creator/tenant data — products, websites, pages, orders,
--              gallery, timeline, links, analytics, contacts, newsletters,
--              AI intelligence, workflow executions, assets, billing records
--              for tenant accounts, and all orphaned records
--
-- Run this inside a single transaction.  If anything fails, nothing is written.
-- =============================================================================

BEGIN;

-- =============================================================================
-- PHASE 0 — Backup recommendation (informational only)
-- =============================================================================
-- Before running this script, ensure a database backup or PITR checkpoint
-- exists.  In Supabase:
--   Dashboard → Database → Backups → Trigger a manual backup
-- Or via CLI:
--   supabase db dump -f ./pre_cleanup_dump.sql
-- =============================================================================

-- =============================================================================
-- PHASE 1 — Detach Super Admin from tenant / agency
-- =============================================================================
-- SUPER_ADMIN users are platform-level.  We nullify their tenant & agency
-- links so they survive the cascade that follows.
UPDATE "User"
SET "tenantId" = NULL, "agencyId" = NULL
WHERE "role" = 'SUPER_ADMIN';

-- =============================================================================
-- PHASE 2 — Delete records that have NO foreign-key relationship to Tenant
--           (CASCADE from Tenant cannot reach these)
-- =============================================================================

-- ── AI / Intelligence Engine ──────────────────────────────────────────────
DELETE FROM "CreatorIntelligence";
DELETE FROM "CreatorProfile";
DELETE FROM "CreatorImport";
DELETE FROM "ProviderFetchLog";
DELETE FROM "ProviderAccount";

-- ── Creator Provisioning ──────────────────────────────────────────────────
DELETE FROM "CreatorProvisionEvent";
DELETE FROM "CreatorProvisionRun";

-- =============================================================================
-- PHASE 3 — Delete records loosely related to Tenant (optional FK, no CASCADE)
-- =============================================================================

-- ── Analytics Events ──────────────────────────────────────────────────────
-- "tenantId" is optional; drop rows that belong to any tenant (including null).
DELETE FROM "AnalyticsEvent";

-- ── Billing v2 (polymorphic account references) ──────────────────────────
-- Clean up billing events, invoices, subscriptions, and accounts for tenant
-- account types.  Agency account records are preserved (platform config).
DELETE FROM "BillingEvent"
WHERE "accountId" IN (
  SELECT "id" FROM "BillingAccount" WHERE "accountType" = 'tenant'
);

DELETE FROM "BillingInvoice"
WHERE "accountId" IN (
  SELECT "id" FROM "BillingAccount" WHERE "accountType" = 'tenant'
);

DELETE FROM "BillingSubscription"
WHERE "accountId" IN (
  SELECT "id" FROM "BillingAccount" WHERE "accountType" = 'tenant'
);

DELETE FROM "BillingAccount"
WHERE "accountType" = 'tenant';

-- =============================================================================
-- PHASE 4 — Delete all Tenants
-- =============================================================================
-- This CASCADE-deletes everything owned by a tenant:
--   User (tenantId), Product, ProductOrder, AffiliateLink, ContactSubmission,
--   NewsletterSubscriber, Setting, GalleryImage, TimelineEvent, Game,
--   SocialStats, AuditLog, ContentFeedItem, Asset, AssetReference,
--   DesignTheme, Offering, Purchase, Workflow, WorkflowExecution,
--   Subscription, Website → { Brand, PublishStatus → PublishSnapshot,
--                              Page → Section → Block },
--   AgencyTenant
-- =============================================================================

DELETE FROM "Tenant";

-- =============================================================================
-- PHASE 5 — Clean up orphaned records (should be none, but belt-and-suspenders)
-- =============================================================================

-- Users that were not cascade-deleted because they had tenantId = NULL
-- and aren't SUPER_ADMIN (should not exist, but safe to remove).
DELETE FROM "User"
WHERE "role" != 'SUPER_ADMIN';

-- Orphaned agency-level users (no tenant, no agency)
DELETE FROM "User"
WHERE "tenantId" IS NULL
  AND "agencyId" IS NULL
  AND "role" != 'SUPER_ADMIN';

-- =============================================================================
-- PHASE 6 — Sequence / Identity reset
-- =============================================================================
-- All tables use UUID or CUID primary keys, so there are no serial sequences
-- to restart.  For tables with sequential integer fields where the app
-- expects fresh starts:
ALTER SEQUENCE IF EXISTS "ProductOrder_id_seq" RESTART;
-- (Add any other sequences identified by: SELECT sequence_name FROM information_schema.sequences;)

-- =============================================================================
-- COMMIT
-- =============================================================================

COMMIT;

-- =============================================================================
-- VALIDATION REPORT
-- =============================================================================

-- Run the queries below AFTER the transaction above to produce the report.

-- ── 1. Super Admin exists ─────────────────────────────────────────────────

SELECT '1. Super Admin' AS check_name,
       CASE WHEN COUNT(*) > 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count,
       STRING_AGG("email", ', ') AS details
FROM "User"
WHERE "role" = 'SUPER_ADMIN';

-- ── 2. No creator accounts remain ──────────────────────────────────────────

SELECT '2. No creator users' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "User"
WHERE "role" != 'SUPER_ADMIN';

-- ── 3. No tenants remain ────────────────────────────────────────────────────

SELECT '3. No tenants' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Tenant";

-- ── 4. No websites remain ───────────────────────────────────────────────────

SELECT '4. No websites' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Website";

-- ── 5. No products remain ───────────────────────────────────────────────────

SELECT '5. No products' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Product";

-- ── 6. No publish snapshots remain ──────────────────────────────────────────

SELECT '6. No publish snapshots' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "PublishSnapshot";

-- ── 7. No builder pages remain ──────────────────────────────────────────────

SELECT '7. No builder pages' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Page";

-- ── 8. No orphaned blocks or sections ───────────────────────────────────────

SELECT '8. No orphaned sections' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Section" s
WHERE NOT EXISTS (SELECT 1 FROM "Page" p WHERE p.id = s."pageId");

SELECT '9. No orphaned blocks' AS check_name,
       CASE WHEN COUNT(*) = 0 THEN 'PASS' ELSE 'FAIL' END AS status,
       COUNT(*) AS record_count
FROM "Block" b
WHERE NOT EXISTS (SELECT 1 FROM "Section" s WHERE s.id = b."sectionId");

-- ── 9. Remaining records summary ────────────────────────────────────────────

SELECT 'Remaining records (non-zero)' AS check_name,
       COUNT(*) AS table_count,
       STRING_AGG(table_name || ': ' || record_count, ', ' ORDER BY table_name) AS details
FROM (
  SELECT 'User' AS table_name, COUNT(*)::text AS record_count FROM "User"
  UNION ALL SELECT 'Tenant', COUNT(*)::text FROM "Tenant"
  UNION ALL SELECT 'Website', COUNT(*)::text FROM "Website"
  UNION ALL SELECT 'Product', COUNT(*)::text FROM "Product"
  UNION ALL SELECT 'ProductOrder', COUNT(*)::text FROM "ProductOrder"
  UNION ALL SELECT 'PublishSnapshot', COUNT(*)::text FROM "PublishSnapshot"
  UNION ALL SELECT 'Page', COUNT(*)::text FROM "Page"
  UNION ALL SELECT 'Section', COUNT(*)::text FROM "Section"
  UNION ALL SELECT 'Block', COUNT(*)::text FROM "Block"
  UNION ALL SELECT 'Theme', COUNT(*)::text FROM "Theme"
  UNION ALL SELECT 'BillingPlan', COUNT(*)::text FROM "BillingPlan"
  UNION ALL SELECT 'BillingFeature', COUNT(*)::text FROM "BillingFeature"
  UNION ALL SELECT 'BillingAccount', COUNT(*)::text FROM "BillingAccount"
  UNION ALL SELECT 'WebsiteAgency', COUNT(*)::text FROM "WebsiteAgency"
  UNION ALL SELECT 'BillingEvent', COUNT(*)::text FROM "BillingEvent"
  UNION ALL SELECT 'AnalyticsEvent', COUNT(*)::text FROM "AnalyticsEvent"
) counts
WHERE record_count::int > 0;

-- =============================================================================
-- DELIVERABLE SUMMARY
-- =============================================================================

/*
╔══════════════════════════════════════════════════════════════════════════╗
║                      CLEANUP DELIVERABLE REPORT                        ║
╠══════════════════════════════════════════════════════════════════════════╣
║                                                                        ║
║  TABLES CLEANED (31)                                                   ║
║  ───────────────                                                       ║
║  AnalyticsEvent          AuditLog               Block                  ║
║  ContentFeedItem         ContactSubmission      CreatorImport          ║
║  CreatorIntelligence     CreatorProfile         CreatorProvisionEvent  ║
║  CreatorProvisionRun     DesignTheme            Asset                  ║
║  AssetReference          Game                   GalleryImage           ║
║  NewsletterSubscriber    Offering               Page                   ║
║  Product                 ProductOrder           AffiliateLink          ║
║  ProviderAccount         ProviderFetchLog       Purchase               ║
║  PublishSnapshot         Section                Setting                ║
║  SocialStats             Subscription           TimelineEvent          ║
║  Workflow                WorkflowExecution      Website                ║
║  Tenant                                                               ║
║                                                                        ║
║  + BillingAccount (tenant-type rows)                                   ║
║  + BillingEvent (tenant-related rows)                                  ║
║  + BillingInvoice (tenant-related rows)                                ║
║  + BillingSubscription (tenant-related rows)                           ║
║  + User (non-SUPER_ADMIN rows)                                         ║
║                                                                        ║
║  TABLES PRESERVED (8)                                                  ║
║  ────────────────                                                      ║
║  BillingPlan            BillingFeature         BillingPlanFeature      ║
║  Theme                  User (SUPER_ADMIN)     WebsiteAgency           ║
║  AgencySubscription     YouTubeQuotaUsage                              ║
║                                                                        ║
║  SEQUENCE RESETS                                                       ║
║  ───────────────                                                       ║
║  No serial sequences exist (all tables use UUID/CUID).                 ║
║  ProductOrder_id_seq restarted as a safety measure.                    ║
║                                                                        ║
║  MANUAL ACTIONS REQUIRED                                               ║
║  ──────────────────────                                                ║
║  1. Run the validation queries (included in this script after COMMIT)  ║
║     to confirm all checks pass.                                        ║
║  2. After cleanup, run `npx prisma db push` or re-apply any pending   ║
║     migrations to ensure the schema is in sync with the Prisma client. ║
║  3. If the newsletter_subscribers table was created via raw SQL        ║
║     (not Prisma migration), ensure it's registered in the migration    ║
║     history by running `npx prisma migrate dev --name add_newsletter`  ║
║  4. Verify the Super Admin can log in and access the admin dashboard.  ║
║                                                                        ║
╚══════════════════════════════════════════════════════════════════════════╝
*/
