-- RCCF-TRACK-01 — Commerce Completion & Fulfillment Runtime.
-- Additive, nullable — zero downtime.
--
-- NOTE (RCCF-LAUNCH-POLISH-05 DB sync): "tenantId"/"productId" must be UUID
-- (they reference Tenant/Product @db.Uuid ids). "orderId" stays TEXT — it
-- references ProductOrder."id" which is @db.Text. The earlier TEXT-everywhere
-- version could not be applied.

ALTER TABLE "Product" ADD COLUMN "downloadUrl" TEXT;

CREATE TABLE "OrderFulfillment" (
  "id" UUID NOT NULL,
  "orderId" TEXT NOT NULL,
  "tenantId" UUID NOT NULL,
  "productId" UUID NOT NULL,
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
  "id" UUID NOT NULL,
  "orderId" TEXT NOT NULL,
  "tenantId" UUID NOT NULL,
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
