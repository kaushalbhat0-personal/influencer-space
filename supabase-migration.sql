-- Add order column to Product (if not already present)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Add order column to AffiliateLink (if not already present)
ALTER TABLE "AffiliateLink" ADD COLUMN IF NOT EXISTS "order" INTEGER NOT NULL DEFAULT 0;

-- Create ProductOrder table
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
