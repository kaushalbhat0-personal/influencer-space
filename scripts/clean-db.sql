-- Clean database: delete all data except SUPER_ADMIN users
-- Run via: npx supabase db execute --file scripts/clean-db.sql

DO $$
DECLARE
  super_admin_ids TEXT[];
BEGIN
  -- Collect super admin user IDs to preserve
  super_admin_ids := ARRAY(SELECT id FROM "User" WHERE role = 'SUPER_ADMIN');

  RAISE NOTICE 'Preserving % super admin(s)', array_length(super_admin_ids, 1);

  -- Delete in dependency order (children before parents)

  -- Storefront / publishing
  DELETE FROM "PublishSnapshot";
  DELETE FROM "PublishStatus";

  -- Builder data
  DELETE FROM "Block";
  DELETE FROM "Section";
  DELETE FROM "Page";

  -- Content
  DELETE FROM "BlogPost";
  DELETE FROM "Faq";
  DELETE FROM "TimelineEvent";
  DELETE FROM "GalleryImage";
  DELETE FROM "Game";
  DELETE FROM "AffiliateLink";
  DELETE FROM "ContactSubmission";
  DELETE FROM "Testimonial";

  -- Products & orders
  DELETE FROM "ProductOrderItem";
  DELETE FROM "ProductOrder";
  DELETE FROM "Product";

  -- Billing
  DELETE FROM "BillingEvent";
  DELETE FROM "BillingSubscription";
  DELETE FROM "BillingAccount";

  -- Events & audit
  DELETE FROM "PlatformEvent";
  DELETE FROM "AuditLog";
  DELETE FROM "AnalyticsEvent";

  -- Generation sessions
  DELETE FROM "GenerationSessionEvent";
  DELETE FROM "GenerationSessionStage";
  DELETE FROM "GenerationSession";

  -- Settings
  DELETE FROM "Setting";

  -- Website & agency
  DELETE FROM "Website";
  DELETE FROM "WebsiteAgency";

  -- Workspace
  DELETE FROM "WorkspaceMember";
  DELETE FROM "Workspace";

  -- Tenant
  DELETE FROM "Tenant";

  -- Users (except super admins)
  DELETE FROM "User" WHERE role != 'SUPER_ADMIN';

  -- Auth / sessions (NextAuth)
  DELETE FROM "Session" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SUPER_ADMIN');
  DELETE FROM "Account" WHERE "userId" NOT IN (SELECT id FROM "User" WHERE role = 'SUPER_ADMIN');
  DELETE FROM "VerificationToken";

  RAISE NOTICE 'Database cleaned. Super admin(s) preserved.';
END $$;
