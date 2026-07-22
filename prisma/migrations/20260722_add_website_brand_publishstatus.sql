-- Migration: add Website, Brand, PublishStatus models
-- Run this in Supabase SQL Editor

-- Step 1: Create tables
CREATE TABLE IF NOT EXISTS "Website" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Website_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Brand" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "tagline" TEXT NOT NULL DEFAULT '',
    "bio" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "PublishStatus" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PublishStatus_pkey" PRIMARY KEY ("id")
);

-- CreateIndex (IF NOT EXISTS compatible)
CREATE UNIQUE INDEX IF NOT EXISTS "Website_tenantId_key" ON "Website"("tenantId");
CREATE INDEX IF NOT EXISTS "Website_tenantId_idx" ON "Website"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Brand_websiteId_key" ON "Brand"("websiteId");
CREATE UNIQUE INDEX IF NOT EXISTS "PublishStatus_websiteId_key" ON "PublishStatus"("websiteId");

-- AddForeignKey (skip if already exists)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Website_tenantId_fkey') THEN
    ALTER TABLE "Website" ADD CONSTRAINT "Website_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Brand_websiteId_fkey') THEN
    ALTER TABLE "Brand" ADD CONSTRAINT "Brand_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublishStatus_websiteId_fkey') THEN
    ALTER TABLE "PublishStatus" ADD CONSTRAINT "PublishStatus_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 2: Backfill existing tenants that don't have a Website yet
INSERT INTO "Website" ("id", "tenantId", "createdAt", "updatedAt")
SELECT gen_random_uuid(), t.id, NOW(), NOW()
FROM "Tenant" t
WHERE NOT EXISTS (SELECT 1 FROM "Website" w WHERE w."tenantId" = t.id);

-- Step 3: Backfill Brand for each Website
INSERT INTO "Brand" ("id", "websiteId", "name", "tagline", "bio", "socialLinks")
SELECT
  gen_random_uuid(),
  w.id,
  COALESCE(
    (SELECT s.value->>'name' FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'brand_config' LIMIT 1),
    (SELECT s.value->>'name' FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'influencer_data' LIMIT 1),
    (SELECT t2.name FROM "Tenant" t2 WHERE t2.id = w."tenantId")
  ),
  COALESCE(
    (SELECT s.value->>'tagline' FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'brand_config' LIMIT 1),
    ''
  ),
  COALESCE(
    (SELECT s.value->>'bio' FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'brand_config' LIMIT 1),
    (SELECT s.value->>'bio' FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'influencer_data' LIMIT 1),
    ''
  ),
  '[]'::jsonb
FROM "Website" w
WHERE NOT EXISTS (SELECT 1 FROM "Brand" b WHERE b."websiteId" = w.id);

-- Step 4: Backfill PublishStatus for each Website
INSERT INTO "PublishStatus" ("id", "websiteId", "state", "publishedAt", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  w.id,
  CASE
    WHEN EXISTS (SELECT 1 FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'demo_metadata' AND s.value->>'published' = 'true')
    THEN 'live' ELSE 'draft'
  END,
  CASE
    WHEN EXISTS (SELECT 1 FROM "Setting" s WHERE s."tenantId" = w."tenantId" AND s.key = 'demo_metadata' AND s.value->>'published' = 'true')
    THEN NOW() ELSE NULL
  END,
  NOW(),
  NOW()
FROM "Website" w
WHERE NOT EXISTS (SELECT 1 FROM "PublishStatus" ps WHERE ps."websiteId" = w.id);

-- Step 5: Builder tables — Page, Section, Block
CREATE TABLE IF NOT EXISTS "Page" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isHome" BOOLEAN NOT NULL DEFAULT false,
    "theme" TEXT NOT NULL DEFAULT 'default',
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Page_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Section" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "pageId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Block" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "sectionId" UUID NOT NULL,
    "moduleId" TEXT NOT NULL,
    "parentId" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Block_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Page_websiteId_slug_key" ON "Page"("websiteId", "slug");
CREATE INDEX IF NOT EXISTS "Page_websiteId_idx" ON "Page"("websiteId");
CREATE INDEX IF NOT EXISTS "Section_pageId_idx" ON "Section"("pageId");
CREATE INDEX IF NOT EXISTS "Block_sectionId_idx" ON "Block"("sectionId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Page_websiteId_fkey') THEN
    ALTER TABLE "Page" ADD CONSTRAINT "Page_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Section_pageId_fkey') THEN
    ALTER TABLE "Section" ADD CONSTRAINT "Section_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Block_sectionId_fkey') THEN
    ALTER TABLE "Block" ADD CONSTRAINT "Block_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 6: Add theme columns to Website
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "themePackageId" TEXT NOT NULL DEFAULT 'neon-dark';
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "themeColors" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "themeFonts" JSONB NOT NULL DEFAULT '{}';
ALTER TABLE "Website" ADD COLUMN IF NOT EXISTS "themeConfig" JSONB NOT NULL DEFAULT '{}';

-- Step 7: PublishSnapshot table + liveVersion on PublishStatus
ALTER TABLE "PublishStatus" ADD COLUMN IF NOT EXISTS "liveVersion" INTEGER;

CREATE TABLE IF NOT EXISTS "PublishSnapshot" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "websiteId" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "state" TEXT NOT NULL DEFAULT 'live',
    "snapshot" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PublishSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PublishSnapshot_websiteId_version_key" ON "PublishSnapshot"("websiteId", "version");
CREATE INDEX IF NOT EXISTS "PublishSnapshot_websiteId_idx" ON "PublishSnapshot"("websiteId");
CREATE INDEX IF NOT EXISTS "PublishStatus_websiteId_idx" ON "PublishStatus"("websiteId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'PublishSnapshot_websiteId_fkey') THEN
    ALTER TABLE "PublishSnapshot" ADD CONSTRAINT "PublishSnapshot_websiteId_fkey" FOREIGN KEY ("websiteId") REFERENCES "Website"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 8: Asset table for Media Library
CREATE TABLE IF NOT EXISTS "Asset" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "filename" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL DEFAULT 0,
    "width" INTEGER,
    "height" INTEGER,
    "checksum" TEXT,
    "storageProvider" TEXT NOT NULL DEFAULT 'local',
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT,
    "thumbnailUrl" TEXT,
    "mediumUrl" TEXT,
    "largeUrl" TEXT,
    "altText" TEXT,
    "referenceCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Asset_tenantId_idx" ON "Asset"("tenantId");
CREATE INDEX IF NOT EXISTS "Asset_checksum_idx" ON "Asset"("checksum");
CREATE INDEX IF NOT EXISTS "Asset_mimeType_idx" ON "Asset"("mimeType");
CREATE INDEX IF NOT EXISTS "Asset_tenantId_createdAt_idx" ON "Asset"("tenantId", "createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Asset_tenantId_fkey') THEN
    ALTER TABLE "Asset" ADD CONSTRAINT "Asset_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE';
CREATE INDEX IF NOT EXISTS "Asset_status_idx" ON "Asset"("status");

CREATE TABLE IF NOT EXISTS "AssetReference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "assetId" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "pageId" UUID,
    "sectionId" UUID,
    "blockId" UUID,
    "field" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssetReference_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "AssetReference_assetId_idx" ON "AssetReference"("assetId");
CREATE INDEX IF NOT EXISTS "AssetReference_tenantId_idx" ON "AssetReference"("tenantId");
CREATE INDEX IF NOT EXISTS "AssetReference_pageId_idx" ON "AssetReference"("pageId");
CREATE INDEX IF NOT EXISTS "AssetReference_sectionId_idx" ON "AssetReference"("sectionId");
CREATE INDEX IF NOT EXISTS "AssetReference_blockId_idx" ON "AssetReference"("blockId");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReference_assetId_fkey') THEN
    ALTER TABLE "AssetReference" ADD CONSTRAINT "AssetReference_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AssetReference_tenantId_fkey') THEN
    ALTER TABLE "AssetReference" ADD CONSTRAINT "AssetReference_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

-- Step 9: DesignTheme table for Theme Studio
CREATE TABLE IF NOT EXISTS "DesignTheme" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mode" TEXT NOT NULL DEFAULT 'light',
    "active" BOOLEAN NOT NULL DEFAULT false,
    "tokens" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DesignTheme_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "DesignTheme_tenantId_idx" ON "DesignTheme"("tenantId");
CREATE INDEX IF NOT EXISTS "DesignTheme_tenantId_active_idx" ON "DesignTheme"("tenantId", "active");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'DesignTheme_tenantId_fkey') THEN
    ALTER TABLE "DesignTheme" ADD CONSTRAINT "DesignTheme_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
