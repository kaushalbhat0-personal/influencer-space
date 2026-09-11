-- RCCF-FINANCE-02 P0-1 — BillingInvoice.providerReference uniqueness
-- SAFE MIGRATION: DO NOT auto-merge/delete duplicates. This migration adds a UNIQUE index
-- CONCURRENTLY WHERE providerReference IS NOT NULL AND != '' only after duplicates are resolved.
-- Pre-migration gate: run src/lib/billing/provider-reference-audit.ts findProviderReferenceDuplicates().
-- If duplicates exist, migration will fail — resolve manually via metadata marking, never auto-delete.

-- Step 1: create unique index CONCURRENTLY (does not block writes, but requires duplicate-free state)
-- Prisma migrate does not support CONCURRENTLY; this is provided as manual SQL for production DBA.
-- The additive migration below is a safe non-concurrent version for CI/test where table is empty;
-- production should run the CONCURRENTLY variant manually after audit.

-- CI/test path (safe when empty): create unique index with WHERE clause
CREATE UNIQUE INDEX IF NOT EXISTS "BillingInvoice_providerReference_key"
ON "BillingInvoice"("providerReference")
WHERE "providerReference" IS NOT NULL AND "providerReference" <> '';

-- Production manual alternative (run outside transaction):
-- CREATE UNIQUE INDEX CONCURRENTLY "BillingInvoice_providerReference_key"
-- ON "BillingInvoice"("providerReference")
-- WHERE "providerReference" IS NOT NULL AND "providerReference" <> '';
