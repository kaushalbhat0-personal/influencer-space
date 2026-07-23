-- CreatorStore Database Cleanup v2.0
-- Run this in Supabase SQL Editor
-- Preserves: Super Admin users, BillingPlan, BillingFeature, Theme
-- Skips tables that don't exist (migration not yet applied)

BEGIN;

-- Helper: delete from table only if it exists
CREATE OR REPLACE FUNCTION safe_delete(tbl text) RETURNS void AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = tbl) THEN
    EXECUTE format('DELETE FROM %I', tbl);
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Phase 1: Identify super admins to preserve
CREATE TEMP TABLE preserved_users AS SELECT id FROM "User" WHERE role = 'SUPER_ADMIN';
CREATE TEMP TABLE preserved_tenants AS SELECT DISTINCT u."tenantId" AS id FROM "User" u JOIN preserved_users pu ON pu.id = u.id WHERE u."tenantId" IS NOT NULL;

-- Phase 2: Delete in FK-safe order (leaf tables first)

-- Builder data
SELECT safe_delete('Block');
SELECT safe_delete('Section');
SELECT safe_delete('Page');
SELECT safe_delete('PublishSnapshot');
SELECT safe_delete('Brand');
SELECT safe_delete('PublishStatus');
SELECT safe_delete('Website');

-- Non-essential entities
SELECT safe_delete('AnalyticsEvent');
SELECT safe_delete('AuditLog');
SELECT safe_delete('ContactSubmission');
SELECT safe_delete('NewsletterSubscriber');
SELECT safe_delete('SocialStats');
SELECT safe_delete('ContentFeedItem');
SELECT safe_delete('CreatorProvisionEvent');
SELECT safe_delete('CreatorProvisionRun');
SELECT safe_delete('CreatorImport');
SELECT safe_delete('CreatorProfile');
SELECT safe_delete('CreatorIntelligence');
SELECT safe_delete('ProviderFetchLog');
SELECT safe_delete('YouTubeQuotaUsage');
SELECT safe_delete('ProviderAccount');
SELECT safe_delete('DesignTheme');
SELECT safe_delete('WorkflowExecution');
SELECT safe_delete('Workflow');

-- Billing v2
SELECT safe_delete('BillingInvoice');
SELECT safe_delete('BillingEvent');
SELECT safe_delete('BillingSubscription');
SELECT safe_delete('BillingAccount');

-- Content entities
SELECT safe_delete('ProductOrder');
SELECT safe_delete('Product');
SELECT safe_delete('Game');
SELECT safe_delete('AffiliateLink');
SELECT safe_delete('TimelineEvent');
SELECT safe_delete('GalleryImage');
SELECT safe_delete('Setting');

-- Workspace
SELECT safe_delete('WorkspaceMember');
SELECT safe_delete('Workspace');

-- Legacy billing
SELECT safe_delete('AgencySubscription');
SELECT safe_delete('Subscription');

-- Agencies
SELECT safe_delete('AgencyTenant');
SELECT safe_delete('WebsiteAgency');

-- Tenants (except those linked to super admins)
DELETE FROM "Tenant" t WHERE NOT EXISTS (SELECT 1 FROM preserved_tenants pt WHERE pt.id = t.id);

-- Users (except super admins)
DELETE FROM "User" u WHERE NOT EXISTS (SELECT 1 FROM preserved_users pu WHERE pu.id = u.id);

-- Cleanup
DROP FUNCTION IF EXISTS safe_delete;
DROP TABLE IF EXISTS preserved_users;
DROP TABLE IF EXISTS preserved_tenants;

COMMIT;

-- Verification
SELECT 'Super Admins Preserved:' as check_name, COUNT(*)::text as count FROM "User" WHERE role = 'SUPER_ADMIN'
UNION ALL
SELECT 'Non-Admin Users Remaining:', COUNT(*)::text FROM "User" WHERE role != 'SUPER_ADMIN'
UNION ALL
SELECT 'Tenants Remaining:', COUNT(*)::text FROM "Tenant";
