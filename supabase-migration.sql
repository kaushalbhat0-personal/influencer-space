-- ============================================================
-- Tenant table: add missing columns
-- ============================================================
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "youtubeApiKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "youtubeChannelId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "twitchChannelId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "instagramApiKey" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "razorpayAccountId" TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS "razorpaySetupComplete" BOOLEAN NOT NULL DEFAULT false;

-- ============================================================
-- Product table: add order column
-- ============================================================
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- GalleryImage table: add missing columns
-- ============================================================
ALTER TABLE "GalleryImage" ADD COLUMN IF NOT EXISTS "mediaType" TEXT NOT NULL DEFAULT 'image';
ALTER TABLE "GalleryImage" ADD COLUMN IF NOT EXISTS "videoUrl" TEXT;

-- ============================================================
-- AffiliateLink table: add order column
-- ============================================================
ALTER TABLE "AffiliateLink" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- ============================================================
-- ProductOrder table
-- ============================================================
CREATE TABLE IF NOT EXISTS "ProductOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenantId" UUID NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
  "productId" UUID NOT NULL REFERENCES "Product"("id") ON DELETE CASCADE,
  "amount" DOUBLE PRECISION NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "razorpayOrderId" TEXT NOT NULL UNIQUE,
  "razorpayPaymentId" TEXT,
  "fanEmail" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "ProductOrder_tenantId_idx" ON "ProductOrder"("tenantId");
CREATE INDEX IF NOT EXISTS "ProductOrder_productId_idx" ON "ProductOrder"("productId");
