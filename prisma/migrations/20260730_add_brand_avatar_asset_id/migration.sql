-- Add all missing columns that exist in schema but not in production
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "avatarAssetId" UUID;
ALTER TABLE "Brand" ADD COLUMN IF NOT EXISTS "bannerAssetId" UUID;

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageAssetId" UUID;

ALTER TABLE "AffiliateLink" ADD COLUMN IF NOT EXISTS "imageAssetId" UUID;

ALTER TABLE "GalleryImage" ADD COLUMN IF NOT EXISTS "assetId" UUID;

ALTER TABLE "TimelineEvent" ADD COLUMN IF NOT EXISTS "imageAssetId" UUID;

ALTER TABLE "Game" ADD COLUMN IF NOT EXISTS "logoAssetId" UUID;

ALTER TABLE "ContentFeedItem" ADD COLUMN IF NOT EXISTS "thumbnailAssetId" UUID;

ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "duration" INTEGER;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "blurHash" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "dominantColor" TEXT;
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "processingStatus" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Asset" ADD COLUMN IF NOT EXISTS "processingError" TEXT;

ALTER TABLE "PlatformEvent" ADD COLUMN IF NOT EXISTS "correlationId" TEXT;

-- AssetReference: entityType/entityId replaced pageId/sectionId/blockId
ALTER TABLE "AssetReference" ADD COLUMN IF NOT EXISTS "entityType" TEXT NOT NULL DEFAULT 'page';
ALTER TABLE "AssetReference" ADD COLUMN IF NOT EXISTS "entityId" TEXT NOT NULL DEFAULT '';
ALTER TABLE "AssetReference" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
