-- RCCF-IMPLEMENTATION-70 — mirror the registry-driven marketing surface into
-- the plan catalog so Super Admin can propagate pricing changes without a
-- redeploy (billing runtime continues to read code/price from the same registry).
-- Additive, nullable — zero downtime.

ALTER TABLE "BillingPlan" ADD COLUMN "marketing" JSONB;
