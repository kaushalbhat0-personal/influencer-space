-- =============================================================================
-- Clean Stale Data & Create Permanent Super Admin
-- =============================================================================
-- This script:
-- 1. Ensures a Super Admin exists with known password
-- 2. Removes stale provisioning data (failed runs, orphan records)
-- 3. Preserves ALL platform seed data (billing plans, pricing, configs, schema)
-- =============================================================================
-- Usage: Run in Supabase SQL Editor
-- =============================================================================

-- Password: admin123 (bcrypt hash)
-- Generated with: node -e "require('bcryptjs').hashSync('admin123', 12)"
-- Verify with: node -e "require('bcryptjs').compare('admin123','$2b$12$...').then(console.log)"

-- ── 1. Ensure Super Admin Exists ────────────────────────────────────────────
-- Creates a Super Admin if none exists. If one exists, updates password.
INSERT INTO "User" ("id", "email", "name", "password", "role", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'admin@creatorspace.app',
  'Super Admin',
  '$2b$12$RPeKD59iGy262s6ccogr7u755TP7w6ZsJGOOiEHPTm6IKPEK1pc6G',
  'SUPER_ADMIN',
  NOW(),
  NOW()
WHERE NOT EXISTS (SELECT 1 FROM "User" WHERE "role" = 'SUPER_ADMIN');

-- Reset existing Super Admin password to known value
UPDATE "User"
SET
  "password" = '$2b$12$RPeKD59iGy262s6ccogr7u755TP7w6ZsJGOOiEHPTm6IKPEK1pc6G',
  "updatedAt" = NOW()
WHERE "role" = 'SUPER_ADMIN';

-- Verify
SELECT id, email, role, "createdAt" FROM "User" WHERE "role" = 'SUPER_ADMIN';

-- ── 2. Remove Stale Provisioning Data ───────────────────────────────────────
-- Removes ONLY provisioning-related data, NOT platform seed data.

-- Failed provision runs
DELETE FROM "CreatorProvisionEvent" WHERE "runId" IN (SELECT "id" FROM "CreatorProvisionRun" WHERE "status" = 'FAILED');
DELETE FROM "CreatorProvisionRun" WHERE "status" = 'FAILED';

-- Orphan timeline events (created outside transaction — see RECOVERY-05)
DELETE FROM "TimelineEvent" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "Tenant");

-- Orphan settings (tenant was deleted but settings remain)
DELETE FROM "Setting" WHERE "tenantId" IS NOT NULL AND "tenantId" NOT IN (SELECT "id" FROM "Tenant");

-- ── 3. Clean Test Tenants/Websites (optional — uncomment if needed) ─────────
-- WARNING: This removes ALL tenants, websites, and related data.
-- Only uncomment if you want a truly clean slate.

-- DELETE FROM "Block" WHERE "sectionId" IN (SELECT "id" FROM "Section" WHERE "pageId" IN (SELECT "id" FROM "Page" WHERE "websiteId" IN (SELECT "id" FROM "Website")));
-- DELETE FROM "Section" WHERE "pageId" IN (SELECT "id" FROM "Page" WHERE "websiteId" IN (SELECT "id" FROM "Website"));
-- DELETE FROM "Page" WHERE "websiteId" IN (SELECT "id" FROM "Website");
-- DELETE FROM "Brand" WHERE "websiteId" IN (SELECT "id" FROM "Website");
-- DELETE FROM "GalleryImage" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "Product" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "AffiliateLink" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "TimelineEvent" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "Setting" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "PublishStatus" WHERE "websiteId" IN (SELECT "id" FROM "Website");
-- DELETE FROM "PublishSnapshot" WHERE "websiteId" IN (SELECT "id" FROM "Website");
-- DELETE FROM "Website" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "WorkspaceMember" WHERE "workspaceId" IN (SELECT "id" FROM "Workspace" WHERE "tenantId" IN (SELECT "id" FROM "Tenant"));
-- DELETE FROM "Workspace" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "User" WHERE "tenantId" IN (SELECT "id" FROM "Tenant");
-- DELETE FROM "Tenant";

-- ── 4. Verify Platform Seed Data Preserved ──────────────────────────────────
SELECT 'BillingPlans' AS "table", COUNT(*) AS "count" FROM "BillingPlan"
UNION ALL
SELECT 'CommercialPricing', COUNT(*) FROM "CommercialPricing"
UNION ALL
SELECT 'RevenueConfiguration', COUNT(*) FROM "RevenueConfiguration"
UNION ALL
SELECT 'BillingConfiguration', COUNT(*) FROM "BillingConfiguration"
UNION ALL
SELECT 'CommissionPolicy', COUNT(*) FROM "CommissionPolicy"
UNION ALL
SELECT 'Users', COUNT(*) FROM "User"
ORDER BY "table";

-- ── 5. Verify Schema Version ────────────────────────────────────────────────
SELECT "version", "upgradedAt" FROM "_PlatformRuntimeSchema" ORDER BY "createdAt" DESC LIMIT 1;

-- =============================================================================
-- Done. Super Admin credentials: admin@creatorspace.app / admin123
-- =============================================================================
