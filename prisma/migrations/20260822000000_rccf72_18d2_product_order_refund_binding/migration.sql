-- RCCF-72.18D.2 — ProductOrder Refund Schema & Provider Binding
-- Add historical payment account binding and refund state tracking to ProductOrder.
-- Additive, nullable — zero downtime.
-- Existing ProductOrder rows will have NULL paymentAccountId and NONE refundStatus.
-- Future DIRECT_CREATOR orders MUST have paymentAccountId set at creation.

-- 1. Create RefundStatus enum
CREATE TYPE "RefundStatus" AS ENUM ('NONE', 'PENDING', 'PARTIAL', 'REFUNDED', 'FAILED');

-- 2. Add new columns to ProductOrder
ALTER TABLE "ProductOrder"
  ADD COLUMN "paymentAccountId" UUID,
  ADD COLUMN "refundStatus" "RefundStatus" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "refundId" TEXT,
  ADD COLUMN "refundAmount" INTEGER,
  ADD COLUMN "refundedAt" TIMESTAMP(3);

-- 3. Add foreign key constraint for paymentAccountId (nullable, RESTRICT on delete)
-- RESTRICT prevents deletion of a PaymentAccount that is referenced by historical orders.
-- This ensures refund capability is preserved even if creator "disconnects" their account.
ALTER TABLE "ProductOrder"
  ADD CONSTRAINT "ProductOrder_paymentAccountId_fkey"
  FOREIGN KEY ("paymentAccountId") REFERENCES "PaymentAccount"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 4. Add indexes for query performance
CREATE INDEX "ProductOrder_paymentAccountId_idx" ON "ProductOrder"("paymentAccountId");
CREATE INDEX "ProductOrder_refundStatus_idx" ON "ProductOrder"("refundStatus");