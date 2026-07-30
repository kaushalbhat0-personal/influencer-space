-- ============================================================================
-- DB RECOVERY — Platform Seed Restoration
-- Run in Supabase SQL Editor
-- Idempotent: safe to re-run
-- ============================================================================
-- Phase 1: Billing Features
-- Phase 2: Billing Plans
-- Phase 3: Plan-Feature Join Records
-- Phase 4: Default Theme
-- Phase 5: Revenue Configuration (defaults)
-- Phase 6: Commission Policy (defaults)
-- Phase 7: Billing Configuration (defaults)
-- Phase 8: Verification
-- ============================================================================

BEGIN;

-- ============================================================================
-- Phase 1: BillingFeature (35 features from canonical FEATURE_CATALOG)
-- ============================================================================

INSERT INTO "BillingFeature" ("id", "key", "description", "valueType") VALUES
  (gen_random_uuid(), 'max_products', 'Maximum products per store', 'numeric'),
  (gen_random_uuid(), 'max_gallery', 'Maximum gallery items', 'numeric'),
  (gen_random_uuid(), 'storage_gb', 'Storage limit in GB', 'numeric'),
  (gen_random_uuid(), 'max_messages', 'Maximum messages per month', 'numeric'),
  (gen_random_uuid(), 'max_orders', 'Maximum orders per month', 'numeric'),
  (gen_random_uuid(), 'max_websites', 'Maximum websites per account', 'numeric'),
  (gen_random_uuid(), 'max_team_members', 'Maximum team members', 'numeric'),
  (gen_random_uuid(), 'max_clients', 'Maximum managed clients (agencies)', 'numeric'),
  (gen_random_uuid(), 'max_api_calls', 'Maximum API calls per month', 'numeric'),
  (gen_random_uuid(), 'custom_domain', 'Custom domain support', 'boolean'),
  (gen_random_uuid(), 'custom_branding', 'Custom branding options', 'boolean'),
  (gen_random_uuid(), 'remove_branding', 'Remove CreatorStore branding', 'boolean'),
  (gen_random_uuid(), 'analytics_basic', 'Basic analytics and insights', 'boolean'),
  (gen_random_uuid(), 'analytics_advanced', 'Advanced analytics and reports', 'boolean'),
  (gen_random_uuid(), 'seo', 'SEO optimization tools', 'boolean'),
  (gen_random_uuid(), 'premium_themes', 'Access to premium themes', 'boolean'),
  (gen_random_uuid(), 'ai_automation', 'AI-powered content and marketing tools', 'boolean'),
  (gen_random_uuid(), 'export_data', 'Data export capabilities', 'boolean'),
  (gen_random_uuid(), 'priority_support', 'Priority support channel', 'boolean'),
  (gen_random_uuid(), 'multiple_users', 'Multiple user accounts', 'boolean'),
  (gen_random_uuid(), 'api_access', 'API access for integrations', 'boolean'),
  (gen_random_uuid(), 'webhooks', 'Webhook integrations', 'boolean'),
  (gen_random_uuid(), 'white_label', 'White-label experience', 'boolean'),
  (gen_random_uuid(), 'basic_builder', 'Page layout editor', 'boolean'),
  (gen_random_uuid(), 'advanced_builder', 'Custom components and advanced layout', 'boolean'),
  (gen_random_uuid(), 'marketplace_access', 'Access theme and template marketplace', 'boolean'),
  (gen_random_uuid(), 'template_library', 'Use professional templates', 'boolean'),
  (gen_random_uuid(), 'navigation_editor', 'Custom navigation menus', 'boolean'),
  (gen_random_uuid(), 'media_storage', 'Asset upload and storage', 'boolean'),
  (gen_random_uuid(), 'automation', 'Workflow automation', 'boolean'),
  (gen_random_uuid(), 'multiple_brands', 'Manage multiple storefronts', 'boolean'),
  (gen_random_uuid(), 'agency_clients', 'Create and manage clients', 'boolean'),
  (gen_random_uuid(), 'bulk_publish', 'Publish multiple sites at once', 'boolean'),
  (gen_random_uuid(), 'custom_components', 'Build custom components', 'boolean'),
  (gen_random_uuid(), 'api_integrations', 'Connect external APIs', 'boolean')
ON CONFLICT ("key") DO NOTHING;

-- ============================================================================
-- Phase 2: BillingPlan (6 plans from canonical getAllPlans())
-- ============================================================================

INSERT INTO "BillingPlan" ("id", "code", "family", "name", "price", "currency", "cycle", "status", "version") VALUES
  (gen_random_uuid(), 'creator_free',  'creator', 'Starter',  0,    'INR', 'monthly', 'ACTIVE', 1),
  (gen_random_uuid(), 'creator_pro',   'creator', 'Pro',      999,  'INR', 'monthly', 'ACTIVE', 1),
  (gen_random_uuid(), 'creator_elite', 'creator', 'Elite',    2999, 'INR', 'monthly', 'ACTIVE', 1),
  (gen_random_uuid(), 'agency_free',   'agency',  'Free',     0,    'INR', 'monthly', 'ACTIVE', 1),
  (gen_random_uuid(), 'agency_studio', 'agency',  'Studio',   1999, 'INR', 'monthly', 'ACTIVE', 1),
  (gen_random_uuid(), 'agency_agency', 'agency',  'Agency',   4999, 'INR', 'monthly', 'ACTIVE', 1)
ON CONFLICT ("code") DO NOTHING;

-- ============================================================================
-- Phase 3: BillingPlanFeature (plan-feature join records)
-- Uses PL/pgSQL to resolve UUIDs by key/code
-- ============================================================================

DO $$
DECLARE
  fid UUID;
  pid UUID;
BEGIN
  -- ── creator_free ──────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'creator_free';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 5) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 100) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 50) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 0) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;

  -- ── creator_pro ───────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'creator_pro';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 50) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 500) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 3) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 0) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;

  -- ── creator_elite ─────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'creator_elite';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 200) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 50) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 5000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 2000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 3) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 0) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 50000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;

  -- ── agency_free ───────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'agency_free';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 100) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 1000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;

  -- ── agency_studio ─────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'agency_studio';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 100) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 25) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 2500) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 5) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 3) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 5) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 25000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, false) ON CONFLICT DO NOTHING;

  -- ── agency_agency ─────────────────────────────────────────────────────────
  SELECT "id" INTO pid FROM "BillingPlan" WHERE "code" = 'agency_agency';

  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_products';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_gallery';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 500) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'storage_gb';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 100) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_messages';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_orders';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, -1) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_websites';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 20) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_team_members';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 10) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 20) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'max_api_calls';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "intValue") VALUES (pid, fid, 100000) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_domain';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'remove_branding';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_basic';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'analytics_advanced';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'seo';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'premium_themes';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'ai_automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'export_data';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'priority_support';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_users';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'webhooks';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'white_label';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'basic_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'advanced_builder';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'marketplace_access';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'template_library';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'navigation_editor';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'media_storage';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'automation';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'multiple_brands';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'agency_clients';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'bulk_publish';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'custom_components';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;
  SELECT "id" INTO fid FROM "BillingFeature" WHERE "key" = 'api_integrations';
  INSERT INTO "BillingPlanFeature" ("planId", "featureId", "boolValue") VALUES (pid, fid, true) ON CONFLICT DO NOTHING;

END $$;

-- ============================================================================
-- Phase 4: Default Theme ("Gamer")
-- ============================================================================
INSERT INTO "Theme" ("id", "name", "primaryColor", "secondaryColor", "accentColor", "backgroundColor", "textColor", "fontFamily", "borderRadius")
SELECT gen_random_uuid(), 'Gamer', '#2D1B69', '#00f5ff', '#ff00e5', '#09090b', '#ffffff', 'Orbitron', '8px'
WHERE NOT EXISTS (SELECT 1 FROM "Theme" WHERE "name" = 'Gamer');

COMMIT;

-- ============================================================================
-- Phase 8: Verification
-- ============================================================================
SELECT 'BillingFeature' AS "table", COUNT(*)::text AS "rows" FROM "BillingFeature"
UNION ALL
SELECT 'BillingPlan', COUNT(*)::text FROM "BillingPlan"
UNION ALL
SELECT 'BillingPlanFeature', COUNT(*)::text FROM "BillingPlanFeature"
UNION ALL
SELECT 'Theme', COUNT(*)::text FROM "Theme"
UNION ALL
SELECT 'User', COUNT(*)::text FROM "User"
ORDER BY "table";
