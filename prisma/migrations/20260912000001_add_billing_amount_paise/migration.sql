-- RCCF-FINANCE-02 P1-11 — BillingInvoice amount Float audit
-- Determine exact impact: Float for money risks rounding. Prefer integer paise/Decimal authority.
-- Safe additive migration: add amountPaise/taxAmountPaise INT as authoritative while keeping Float amount
-- for backward compatibility. No destructive conversion. Existing values proven via SELECT before migration.
-- Compatibility strategy: write to both columns; read prefers paise when present; backfill in next deploy.

-- Add paise columns (nullable initially for backfill safety)
ALTER TABLE "BillingInvoice" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER;
ALTER TABLE "BillingInvoice" ADD COLUMN IF NOT EXISTS "taxAmountPaise" INTEGER DEFAULT 0;

-- Backfill from existing Float (proved values: SELECT amount, amount*100 FROM BillingInvoice)
UPDATE "BillingInvoice" SET "amountPaise" = ROUND("amount" * 100)::INTEGER WHERE "amountPaise" IS NULL;
UPDATE "BillingInvoice" SET "taxAmountPaise" = ROUND("taxAmount" * 100)::INTEGER WHERE "taxAmountPaise" IS NULL;

-- CommissionEntry similarly: keep Float but add paise authority? Additive for future.
ALTER TABLE "CommissionEntry" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER;
ALTER TABLE "CommissionEntry" ADD COLUMN IF NOT EXISTS "partnerSharePaise" INTEGER;
UPDATE "CommissionEntry" SET "amountPaise" = ROUND("amount" * 100)::INTEGER WHERE "amountPaise" IS NULL;
UPDATE "CommissionEntry" SET "partnerSharePaise" = ROUND("partnerShare" * 100)::INTEGER WHERE "partnerSharePaise" IS NULL;

-- ProductOrder already has correct: amount Float but refundAmount Int paise. Add product paid amount paise for consistency? Keep Float for now with same pattern.
ALTER TABLE "ProductOrder" ADD COLUMN IF NOT EXISTS "amountPaise" INTEGER;
UPDATE "ProductOrder" SET "amountPaise" = ROUND("amount" * 100)::INTEGER WHERE "amountPaise" IS NULL;

-- Future: make paise NOT NULL and make Float generated or drop after verification. Not in this deploy.
