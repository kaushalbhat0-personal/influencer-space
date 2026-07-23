-- Run in Supabase SQL Editor
-- Adds Workspace, WorkspaceMember, and billing v2 columns
-- Safe to run multiple times (IF NOT EXISTS / IF NOT NULL)

-- Enums
DO $$ BEGIN
  CREATE TYPE "WorkspaceType" AS ENUM ('TENANT', 'AGENCY');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "WorkspaceStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Workspace table
CREATE TABLE IF NOT EXISTS "Workspace" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "type" "WorkspaceType" NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "status" "WorkspaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "isFreelancer" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT NOT NULL DEFAULT 'en-IN',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "tenantId" UUID,
    "agencyId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Workspace_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_slug_key" ON "Workspace"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_tenantId_key" ON "Workspace"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Workspace_agencyId_key" ON "Workspace"("agencyId");
CREATE INDEX IF NOT EXISTS "Workspace_type_idx" ON "Workspace"("type");
CREATE INDEX IF NOT EXISTS "Workspace_status_idx" ON "Workspace"("status");

ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL;
ALTER TABLE "Workspace" ADD CONSTRAINT "Workspace_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "WebsiteAgency"("id") ON DELETE SET NULL;

-- WorkspaceMember table
CREATE TABLE IF NOT EXISTS "WorkspaceMember" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workspaceId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "WorkspaceRole" NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "invitedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "joinedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WorkspaceMember_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_idx" ON "WorkspaceMember"("workspaceId");
CREATE INDEX IF NOT EXISTS "WorkspaceMember_userId_idx" ON "WorkspaceMember"("userId");
CREATE UNIQUE INDEX IF NOT EXISTS "WorkspaceMember_workspaceId_userId_key" ON "WorkspaceMember"("workspaceId", "userId");

ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE;
ALTER TABLE "WorkspaceMember" ADD CONSTRAINT "WorkspaceMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- Add workspaceId columns to billing tables (if not exist)
DO $$ BEGIN
  ALTER TABLE "BillingSubscription" ADD COLUMN "workspaceId" UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingSubscription" ADD COLUMN "cancelledAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingSubscription" ADD COLUMN "cancellationReason" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingEvent" ADD COLUMN "workspaceId" UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD COLUMN "workspaceId" UUID;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD COLUMN "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD COLUMN "lineItems" JSONB DEFAULT '[]';
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD COLUMN "invoiceUrl" TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD COLUMN "dueAt" TIMESTAMP(3);
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Indexes for new columns
CREATE UNIQUE INDEX IF NOT EXISTS "BillingSubscription_workspaceId_key" ON "BillingSubscription"("workspaceId");
CREATE INDEX IF NOT EXISTS "BillingSubscription_workspaceId_idx" ON "BillingSubscription"("workspaceId");
CREATE INDEX IF NOT EXISTS "BillingEvent_workspaceId_idx" ON "BillingEvent"("workspaceId");
CREATE INDEX IF NOT EXISTS "BillingInvoice_workspaceId_idx" ON "BillingInvoice"("workspaceId");
CREATE INDEX IF NOT EXISTS "BillingInvoice_dueAt_idx" ON "BillingInvoice"("dueAt");

-- FK constraints for new workspaceId columns
DO $$ BEGIN
  ALTER TABLE "BillingSubscription" ADD CONSTRAINT "BillingSubscription_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingEvent" ADD CONSTRAINT "BillingEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


