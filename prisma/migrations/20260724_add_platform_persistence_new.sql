CREATE TYPE "PartnerType" AS ENUM ('freelancer', 'agency', 'enterprise', 'marketplace', 'affiliate');

-- CreateEnum
CREATE TYPE "PartnerStatus" AS ENUM ('pending', 'active', 'suspended', 'disabled', 'invited', 'archived');

-- CreateTable
CREATE TABLE "PlatformEvent" (
    "id" UUID NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "aggregateId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'platform',
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlatformEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
    "type" "PartnerType" NOT NULL DEFAULT 'agency',
    "status" "PartnerStatus" NOT NULL DEFAULT 'active',
    "businessName" TEXT NOT NULL,
    "logo" TEXT,
    "website" TEXT,
    "description" TEXT,
    "taxIdentifier" TEXT,
    "country" TEXT,
    "timezone" TEXT DEFAULT 'Asia/Kolkata',
    "supportEmail" TEXT,
    "contactPerson" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '{}',
    "settings" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Partner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerMember" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerWorkspaceAssignment" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "workspaceName" TEXT NOT NULL,
    "workspaceSlug" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "reason" TEXT NOT NULL DEFAULT 'created',
    "assignedBy" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "transferredAt" TIMESTAMP(3),
    "removedAt" TIMESTAMP(3),

    CONSTRAINT "PartnerWorkspaceAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PartnerInvite" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'viewer',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "invitedBy" TEXT NOT NULL,
    "acceptedBy" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "declinedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "expiredAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PartnerInvite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" UUID NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'default',
    "status" TEXT NOT NULL DEFAULT 'active',
    "partnerId" UUID,
    "platformSharePercent" INTEGER NOT NULL,
    "partnerSharePercent" INTEGER NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 100,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEntry" (
    "id" UUID NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "partnerId" UUID NOT NULL,
    "subscriptionId" TEXT,
    "planCode" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "platformShare" DOUBLE PRECISION NOT NULL,
    "partnerShare" DOUBLE PRECISION NOT NULL,
    "platformPercent" INTEGER NOT NULL,
    "partnerPercent" INTEGER NOT NULL,
    "entryType" TEXT NOT NULL DEFAULT 'commission_created',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "description" TEXT,
    "ruleId" UUID,
    "parentEntryId" UUID,
    "clearedAt" TIMESTAMP(3),
    "reversedAt" TIMESTAMP(3),
    "audit" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutBatch" (
    "id" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "provider" TEXT NOT NULL DEFAULT 'manual',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "total" DOUBLE PRECISION NOT NULL,
    "fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netAmount" DOUBLE PRECISION NOT NULL,
    "entryCount" INTEGER NOT NULL DEFAULT 1,
    "idempotencyKey" TEXT NOT NULL,
    "providerReference" TEXT,
    "bankReference" TEXT,
    "failureReason" TEXT,
    "audit" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PayoutBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PayoutReservation" (
    "id" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "partnerId" UUID NOT NULL,
    "commissionEntryId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'reserved',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),

    CONSTRAINT "PayoutReservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_subdomain_key" ON "Tenant"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_razorpayAccountId_key" ON "Tenant"("razorpayAccountId");

-- CreateIndex
CREATE INDEX "Tenant_customDomain_idx" ON "Tenant"("customDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Website_tenantId_key" ON "Website"("tenantId");

-- CreateIndex
CREATE INDEX "Website_tenantId_idx" ON "Website"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_websiteId_key" ON "Brand"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishStatus_websiteId_key" ON "PublishStatus"("websiteId");

-- CreateIndex
CREATE INDEX "PublishStatus_websiteId_idx" ON "PublishStatus"("websiteId");

-- CreateIndex
CREATE INDEX "PublishStatus_state_idx" ON "PublishStatus"("state");

-- CreateIndex
CREATE INDEX "PublishSnapshot_websiteId_idx" ON "PublishSnapshot"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "PublishSnapshot_websiteId_version_key" ON "PublishSnapshot"("websiteId", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Theme_name_key" ON "Theme"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_tenantId_key" ON "Subscription"("tenantId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_idx" ON "Subscription"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAgency_subdomain_key" ON "WebsiteAgency"("subdomain");

-- CreateIndex
CREATE UNIQUE INDEX "WebsiteAgency_razorpayAccountId_key" ON "WebsiteAgency"("razorpayAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyTenant_tenantId_key" ON "AgencyTenant"("tenantId");

-- CreateIndex
CREATE INDEX "AgencyTenant_agencyId_idx" ON "AgencyTenant"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySubscription_agencyId_key" ON "AgencySubscription"("agencyId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_slug_key" ON "Workspace"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_tenantId_key" ON "Workspace"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Workspace_agencyId_key" ON "Workspace"("agencyId");

-- CreateIndex
CREATE INDEX "Workspace_type_idx" ON "Workspace"("type");

-- CreateIndex
CREATE INDEX "Workspace_status_idx" ON "Workspace"("status");

-- CreateIndex
CREATE INDEX "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");

-- CreateIndex
CREATE INDEX "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_agencyId_idx" ON "User"("agencyId");

-- CreateIndex
CREATE INDEX "Product_tenantId_idx" ON "Product"("tenantId");

-- CreateIndex
CREATE INDEX "Product_slug_tenantId_idx" ON "Product"("slug", "tenantId");

-- CreateIndex
CREATE INDEX "Product_status_idx" ON "Product"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ProductOrder_razorpayOrderId_key" ON "ProductOrder"("razorpayOrderId");

-- CreateIndex
CREATE INDEX "ProductOrder_tenantId_idx" ON "ProductOrder"("tenantId");

-- CreateIndex
CREATE INDEX "ProductOrder_productId_idx" ON "ProductOrder"("productId");

-- CreateIndex
CREATE INDEX "AffiliateLink_tenantId_idx" ON "AffiliateLink"("tenantId");

-- CreateIndex
CREATE INDEX "ContactSubmission_tenantId_idx" ON "ContactSubmission"("tenantId");

-- CreateIndex
CREATE INDEX "NewsletterSubscriber_tenantId_idx" ON "NewsletterSubscriber"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "NewsletterSubscriber_tenantId_email_key" ON "NewsletterSubscriber"("tenantId", "email");

-- CreateIndex
CREATE INDEX "Setting_tenantId_idx" ON "Setting"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "Setting_tenantId_key_key" ON "Setting"("tenantId", "key");

-- CreateIndex
CREATE INDEX "GalleryImage_tenantId_idx" ON "GalleryImage"("tenantId");

-- CreateIndex
CREATE INDEX "GalleryImage_status_idx" ON "GalleryImage"("status");

-- CreateIndex
CREATE INDEX "GalleryImage_category_idx" ON "GalleryImage"("category");

-- CreateIndex
CREATE INDEX "TimelineEvent_tenantId_idx" ON "TimelineEvent"("tenantId");

-- CreateIndex
CREATE INDEX "Game_tenantId_idx" ON "Game"("tenantId");

-- CreateIndex
CREATE INDEX "SocialStats_tenantId_idx" ON "SocialStats"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "SocialStats_tenantId_platform_key" ON "SocialStats"("tenantId", "platform");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_createdAt_idx" ON "AuditLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentFeedItem_tenantId_pinned_hidden_order_idx" ON "ContentFeedItem"("tenantId", "pinned", "hidden", "order");

-- CreateIndex
CREATE UNIQUE INDEX "ContentFeedItem_tenantId_externalId_key" ON "ContentFeedItem"("tenantId", "externalId");

-- CreateIndex
CREATE INDEX "Page_websiteId_idx" ON "Page"("websiteId");

-- CreateIndex
CREATE UNIQUE INDEX "Page_websiteId_slug_key" ON "Page"("websiteId", "slug");

-- CreateIndex
CREATE INDEX "Section_pageId_idx" ON "Section"("pageId");

-- CreateIndex
CREATE INDEX "Block_sectionId_idx" ON "Block"("sectionId");

-- CreateIndex
CREATE INDEX "CreatorProvisionRun_status_idx" ON "CreatorProvisionRun"("status");

-- CreateIndex
CREATE INDEX "CreatorProvisionRun_startedAt_idx" ON "CreatorProvisionRun"("startedAt");

-- CreateIndex
CREATE INDEX "CreatorProvisionRun_tenantId_idx" ON "CreatorProvisionRun"("tenantId");

-- CreateIndex
CREATE INDEX "CreatorProvisionEvent_runId_timestamp_idx" ON "CreatorProvisionEvent"("runId", "timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "BillingAccount_accountType_accountId_key" ON "BillingAccount"("accountType", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");

-- CreateIndex
CREATE UNIQUE INDEX "BillingFeature_key_key" ON "BillingFeature"("key");

-- CreateIndex
CREATE UNIQUE INDEX "BillingSubscription_workspaceId_key" ON "BillingSubscription"("workspaceId");

-- CreateIndex
CREATE INDEX "BillingSubscription_accountId_idx" ON "BillingSubscription"("accountId");

-- CreateIndex
CREATE INDEX "BillingSubscription_planId_idx" ON "BillingSubscription"("planId");

-- CreateIndex
CREATE INDEX "BillingSubscription_workspaceId_idx" ON "BillingSubscription"("workspaceId");

-- CreateIndex
CREATE UNIQUE INDEX "BillingEvent_idempotencyKey_key" ON "BillingEvent"("idempotencyKey");

-- CreateIndex
CREATE INDEX "BillingEvent_accountId_idx" ON "BillingEvent"("accountId");

-- CreateIndex
CREATE INDEX "BillingEvent_workspaceId_idx" ON "BillingEvent"("workspaceId");

-- CreateIndex
CREATE INDEX "BillingEvent_type_idx" ON "BillingEvent"("type");

-- CreateIndex
CREATE INDEX "BillingEvent_createdAt_idx" ON "BillingEvent"("createdAt");

-- CreateIndex
CREATE INDEX "BillingInvoice_workspaceId_idx" ON "BillingInvoice"("workspaceId");

-- CreateIndex
CREATE INDEX "BillingInvoice_status_idx" ON "BillingInvoice"("status");

-- CreateIndex
CREATE INDEX "BillingInvoice_dueAt_idx" ON "BillingInvoice"("dueAt");

-- CreateIndex
CREATE INDEX "ProviderAccount_provider_idx" ON "ProviderAccount"("provider");

-- CreateIndex
CREATE INDEX "ProviderAccount_handle_idx" ON "ProviderAccount"("handle");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderAccount_provider_externalId_key" ON "ProviderAccount"("provider", "externalId");

-- CreateIndex
CREATE INDEX "ProviderFetchLog_provider_createdAt_idx" ON "ProviderFetchLog"("provider", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderFetchLog_accountId_idx" ON "ProviderFetchLog"("accountId");

-- CreateIndex
CREATE UNIQUE INDEX "YouTubeQuotaUsage_date_key" ON "YouTubeQuotaUsage"("date");

-- CreateIndex
CREATE INDEX "CreatorProfile_platform_handle_idx" ON "CreatorProfile"("platform", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorIntelligence_profileId_key" ON "CreatorIntelligence"("profileId");

-- CreateIndex
CREATE INDEX "CreatorIntelligence_profileId_idx" ON "CreatorIntelligence"("profileId");

-- CreateIndex
CREATE INDEX "CreatorImport_status_idx" ON "CreatorImport"("status");

-- CreateIndex
CREATE INDEX "CreatorImport_createdAt_idx" ON "CreatorImport"("createdAt");

-- CreateIndex
CREATE INDEX "CreatorImport_provider_idx" ON "CreatorImport"("provider");

-- CreateIndex
CREATE INDEX "CreatorImport_creatorName_idx" ON "CreatorImport"("creatorName");

-- CreateIndex
CREATE INDEX "Asset_tenantId_idx" ON "Asset"("tenantId");

-- CreateIndex
CREATE INDEX "Asset_checksum_idx" ON "Asset"("checksum");

-- CreateIndex
CREATE INDEX "Asset_mimeType_idx" ON "Asset"("mimeType");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE INDEX "Asset_tenantId_createdAt_idx" ON "Asset"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AssetReference_assetId_idx" ON "AssetReference"("assetId");

-- CreateIndex
CREATE INDEX "AssetReference_tenantId_idx" ON "AssetReference"("tenantId");

-- CreateIndex
CREATE INDEX "AssetReference_pageId_idx" ON "AssetReference"("pageId");

-- CreateIndex
CREATE INDEX "AssetReference_sectionId_idx" ON "AssetReference"("sectionId");

-- CreateIndex
CREATE INDEX "AssetReference_blockId_idx" ON "AssetReference"("blockId");

-- CreateIndex
CREATE INDEX "DesignTheme_tenantId_idx" ON "DesignTheme"("tenantId");

-- CreateIndex
CREATE INDEX "DesignTheme_tenantId_active_idx" ON "DesignTheme"("tenantId", "active");

-- CreateIndex
CREATE INDEX "Offering_tenantId_idx" ON "Offering"("tenantId");

-- CreateIndex
CREATE INDEX "Offering_tenantId_status_idx" ON "Offering"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Offering_type_idx" ON "Offering"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Offering_tenantId_slug_key" ON "Offering"("tenantId", "slug");

-- CreateIndex
CREATE INDEX "Purchase_offeringId_idx" ON "Purchase"("offeringId");

-- CreateIndex
CREATE INDEX "Purchase_tenantId_idx" ON "Purchase"("tenantId");

-- CreateIndex
CREATE INDEX "Purchase_status_idx" ON "Purchase"("status");

-- CreateIndex
CREATE INDEX "Purchase_customerEmail_idx" ON "Purchase"("customerEmail");

-- CreateIndex
CREATE INDEX "Workflow_tenantId_idx" ON "Workflow"("tenantId");

-- CreateIndex
CREATE INDEX "Workflow_trigger_idx" ON "Workflow"("trigger");

-- CreateIndex
CREATE INDEX "Workflow_enabled_idx" ON "Workflow"("enabled");

-- CreateIndex
CREATE INDEX "WorkflowExecution_workflowId_idx" ON "WorkflowExecution"("workflowId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_tenantId_idx" ON "WorkflowExecution"("tenantId");

-- CreateIndex
CREATE INDEX "WorkflowExecution_status_idx" ON "WorkflowExecution"("status");

-- CreateIndex
CREATE INDEX "WorkflowExecution_createdAt_idx" ON "WorkflowExecution"("createdAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_occurredAt_idx" ON "AnalyticsEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_source_eventType_idx" ON "AnalyticsEvent"("source", "eventType");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_eventType_occurredAt_idx" ON "AnalyticsEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_occurredAt_idx" ON "AnalyticsEvent"("occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_eventType_occurredAt_idx" ON "PlatformEvent"("eventType", "occurredAt");

-- CreateIndex
CREATE INDEX "PlatformEvent_aggregateId_idx" ON "PlatformEvent"("aggregateId");

-- CreateIndex
CREATE INDEX "PlatformEvent_occurredAt_idx" ON "PlatformEvent"("occurredAt");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerMember_partnerId_userId_key" ON "PartnerMember"("partnerId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "PartnerWorkspaceAssignment_workspaceId_key" ON "PartnerWorkspaceAssignment"("workspaceId");

-- CreateIndex
CREATE INDEX "PartnerWorkspaceAssignment_partnerId_idx" ON "PartnerWorkspaceAssignment"("partnerId");

-- CreateIndex
CREATE INDEX "PartnerWorkspaceAssignment_status_idx" ON "PartnerWorkspaceAssignment"("status");

-- CreateIndex
CREATE INDEX "PartnerInvite_partnerId_status_idx" ON "PartnerInvite"("partnerId", "status");

-- CreateIndex
CREATE INDEX "PartnerInvite_email_idx" ON "PartnerInvite"("email");

-- CreateIndex
CREATE INDEX "CommissionRule_partnerId_idx" ON "CommissionRule"("partnerId");

-- CreateIndex
CREATE INDEX "CommissionRule_status_effectiveFrom_effectiveTo_idx" ON "CommissionRule"("status", "effectiveFrom", "effectiveTo");

-- CreateIndex
CREATE INDEX "CommissionEntry_partnerId_createdAt_idx" ON "CommissionEntry"("partnerId", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionEntry_invoiceId_idx" ON "CommissionEntry"("invoiceId");

-- CreateIndex
CREATE INDEX "CommissionEntry_status_idx" ON "CommissionEntry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PayoutBatch_idempotencyKey_key" ON "PayoutBatch"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayoutBatch_partnerId_idx" ON "PayoutBatch"("partnerId");

-- CreateIndex
CREATE INDEX "PayoutBatch_status_idx" ON "PayoutBatch"("status");

-- CreateIndex
CREATE INDEX "PayoutBatch_idempotencyKey_idx" ON "PayoutBatch"("idempotencyKey");

-- CreateIndex
CREATE INDEX "PayoutReservation_batchId_idx" ON "PayoutReservation"("batchId");

-- CreateIndex
CREATE INDEX "PayoutReservation_partnerId_idx" ON "PayoutReservation"("partnerId");

-- CreateIndex
CREATE INDEX "PayoutReservation_commissionEntryId_idx" ON "PayoutReservation"("commissionEntryId");

-- CreateIndex
CREATE INDEX "PayoutReservation_status_idx" ON "PayoutReservation"("status");

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_themeId_fkey" FOREIGN KEY ("themeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Website" ADD CONSTRAINT "Website_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishStatus" ADD CONSTRAINT "PublishStatus_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PublishSnapshot" ADD CONSTRAINT "PublishSnapshot_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "PublishStatus"("websiteId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebsiteAgency" ADD CONSTRAINT "WebsiteAgency_defaultThemeId_fkey" FOREIGN KEY ("defaultThemeId") REFERENCES "Theme"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyTenant" ADD CONSTRAINT "AgencyTenant_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyTenant" ADD CONSTRAINT "AgencyTenant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateLink" ADD CONSTRAINT "AffiliateLink_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContactSubmission" ADD CONSTRAINT "ContactSubmission_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewsletterSubscriber" ADD CONSTRAINT "NewsletterSubscriber_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Setting" ADD CONSTRAINT "Setting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimelineEvent" ADD CONSTRAINT "TimelineEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SocialStats" ADD CONSTRAINT "SocialStats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentFeedItem" ADD CONSTRAINT "ContentFeedItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Page" ADD CONSTRAINT "Page_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Block" ADD CONSTRAINT "Block_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProvisionEvent" ADD CONSTRAINT "CreatorProvisionEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "CreatorProvisionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPlanFeature" ADD CONSTRAINT "BillingPlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingPlanFeature" ADD CONSTRAINT "BillingPlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "BillingFeature"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "BillingAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFetchLog" ADD CONSTRAINT "ProviderFetchLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorIntelligence" ADD CONSTRAINT "CreatorIntelligence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReference" ADD CONSTRAINT "AssetReference_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetReference" ADD CONSTRAINT "AssetReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignTheme" ADD CONSTRAINT "DesignTheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Offering" ADD CONSTRAINT "Offering_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_offeringId_fkey" FOREIGN KEY ("offeringId") REFERENCES "Offering"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Purchase" ADD CONSTRAINT "Purchase_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workflow" ADD CONSTRAINT "Workflow_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "Workflow"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkflowExecution" ADD CONSTRAINT "WorkflowExecution_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerMember" ADD CONSTRAINT "PartnerMember_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerWorkspaceAssignment" ADD CONSTRAINT "PartnerWorkspaceAssignment_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PartnerInvite" ADD CONSTRAINT "PartnerInvite_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "Partner"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PayoutReservation" ADD CONSTRAINT "PayoutReservation_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "PayoutBatch"("id") ON DELETE CASCADE ON UPDATE CASCADE;


