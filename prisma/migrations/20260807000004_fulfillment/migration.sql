-- RCCF-TRACK-01 — Commerce Completion & Fulfillment Runtime.
-- Additive, nullable — zero downtime.

ALTER TABLE "Product" ADD COLUMN "downloadUrl" TEXT;

CREATE TABLE "OrderFulfillment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'digital',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "trackingNumber" TEXT,
  "courier" TEXT,
  "carrierNotes" TEXT,
  "shippedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "downloadUrl" TEXT,
  "downloadToken" TEXT,
  "downloadExpiresAt" TIMESTAMP(3),
  "downloadLimit" INTEGER NOT NULL DEFAULT 5,
  "downloadCount" INTEGER NOT NULL DEFAULT 0,
  "timeline" JSONB NOT NULL DEFAULT '[]',
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "OrderFulfillment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OrderFulfillment_orderId_key" ON "OrderFulfillment"("orderId");
CREATE UNIQUE INDEX "OrderFulfillment_downloadToken_key" ON "OrderFulfillment"("downloadToken");
CREATE INDEX "OrderFulfillment_tenantId_status_idx" ON "OrderFulfillment"("tenantId", "status");
CREATE INDEX "OrderFulfillment_tenantId_createdAt_idx" ON "OrderFulfillment"("tenantId", "createdAt");

ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderFulfillment" ADD CONSTRAINT "OrderFulfillment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "ShippingAddress" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "line1" TEXT,
  "line2" TEXT,
  "city" TEXT,
  "state" TEXT,
  "pin" TEXT,
  "country" TEXT,
  "instructions" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShippingAddress_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShippingAddress_orderId_key" ON "ShippingAddress"("orderId");
CREATE INDEX "ShippingAddress_tenantId_idx" ON "ShippingAddress"("tenantId");

ALTER TABLE "ShippingAddress" ADD CONSTRAINT "ShippingAddress_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ProductOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
