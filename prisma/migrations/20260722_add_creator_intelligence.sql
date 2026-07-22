-- Migration: add Creator Intelligence Engine tables
-- Run this in Supabase SQL Editor

-- ProviderAccount
CREATE TABLE IF NOT EXISTS "ProviderAccount" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "handle" TEXT,
    "name" TEXT,
    "profileData" JSONB NOT NULL DEFAULT '{}',
    "fetchedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ProviderAccount_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProviderAccount_provider_externalId_key" ON "ProviderAccount"("provider", "externalId");
CREATE INDEX IF NOT EXISTS "ProviderAccount_provider_idx" ON "ProviderAccount"("provider");
CREATE INDEX IF NOT EXISTS "ProviderAccount_handle_idx" ON "ProviderAccount"("handle");

-- ProviderFetchLog
CREATE TABLE IF NOT EXISTS "ProviderFetchLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "provider" TEXT NOT NULL,
    "accountId" UUID,
    "endpoint" TEXT NOT NULL,
    "quotaUnits" INTEGER NOT NULL DEFAULT 1,
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "cached" BOOLEAN NOT NULL DEFAULT false,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProviderFetchLog_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "ProviderFetchLog_provider_createdAt_idx" ON "ProviderFetchLog"("provider", "createdAt");
CREATE INDEX IF NOT EXISTS "ProviderFetchLog_accountId_idx" ON "ProviderFetchLog"("accountId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProviderFetchLog_accountId_fkey') THEN
    ALTER TABLE "ProviderFetchLog" ADD CONSTRAINT "ProviderFetchLog_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "ProviderAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- YouTubeQuotaUsage
CREATE TABLE IF NOT EXISTS "YouTubeQuotaUsage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "date" TIMESTAMP(3) NOT NULL,
    "unitsUsed" INTEGER NOT NULL DEFAULT 0,
    "calls" INTEGER NOT NULL DEFAULT 0,
    "failures" INTEGER NOT NULL DEFAULT 0,
    "avgLatencyMs" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "YouTubeQuotaUsage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "YouTubeQuotaUsage_date_key" ON "YouTubeQuotaUsage"("date");

-- CreatorProfile
CREATE TABLE IF NOT EXISTS "CreatorProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "description" TEXT,
    "avatarUrl" TEXT,
    "bannerUrl" TEXT,
    "followers" INTEGER NOT NULL DEFAULT 0,
    "videoCount" INTEGER NOT NULL DEFAULT 0,
    "viewCount" BIGINT NOT NULL DEFAULT 0,
    "country" TEXT,
    "platform" TEXT NOT NULL,
    "handle" TEXT,
    "externalId" TEXT,
    "socialLinks" JSONB NOT NULL DEFAULT '[]',
    "latestContent" JSONB NOT NULL DEFAULT '[]',
    "categories" JSONB NOT NULL DEFAULT '[]',
    "keywords" JSONB NOT NULL DEFAULT '[]',
    "language" TEXT,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "CreatorProfile_platform_handle_idx" ON "CreatorProfile"("platform", "handle");

-- CreatorIntelligence
CREATE TABLE IF NOT EXISTS "CreatorIntelligence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "profileId" UUID NOT NULL,
    "niche" TEXT NOT NULL,
    "subNiche" TEXT,
    "audience" TEXT,
    "brandPersonality" TEXT,
    "brandTone" TEXT,
    "visualStyle" TEXT,
    "contentStyle" TEXT,
    "websiteGoal" TEXT,
    "monetization" TEXT,
    "recommendedTheme" TEXT,
    "recommendedTemplate" TEXT,
    "recommendedSections" JSONB NOT NULL DEFAULT '[]',
    "seoKeywords" JSONB NOT NULL DEFAULT '[]',
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasoning" TEXT,
    "model" TEXT NOT NULL DEFAULT 'heuristic',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreatorIntelligence_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CreatorIntelligence_profileId_key" ON "CreatorIntelligence"("profileId");
CREATE INDEX IF NOT EXISTS "CreatorIntelligence_profileId_idx" ON "CreatorIntelligence"("profileId");

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CreatorIntelligence_profileId_fkey') THEN
    ALTER TABLE "CreatorIntelligence" ADD CONSTRAINT "CreatorIntelligence_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "CreatorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
