# Pricing Versioning — RCCF-IMPLEMENTATION-71

## Model

`PlanPricingVersion`:
`id · planCode · planId · payload (Json) · author · changeNote · createdAt`.
Indexed on `(planCode, createdAt)`. Every `savePlanConfig` creates a version
row; `rollbackPlanVersion` restores a payload and records a new rollback
version.

## What is captured

| Field | Source |
| --- | --- |
| Who changed | `session.user.email/name` (stored as `author`) |
| When | `createdAt` (ISO) |
| What changed | the full `runtimeConfig` JSON payload (capabilities, featureOverrides, marketing, pricing + schedule) |
| Why | optional `changeNote` from the editor |

## Rollback

`rollbackPlanVersion(planCode, versionId)`:
1. Loads the version (validates it belongs to the plan).
2. Restores `runtimeConfig` on the `BillingPlan`.
3. Records a new version (`changeNote: "Rollback to <id>"`).
4. Audits via `logAction` + revalidates `/pricing`, `/`, `/super-admin/pricing`.

Rollback is itself versioned, so any rollback is undoable by rolling forward.

## Audit

All pricing mutations (`savePlanConfig`, `rollbackPlanVersion`, `upsertCoupon`,
`upsertLaunchProgram`, `resyncBillingCatalog`) write `AuditLog` entries with the
actor, code and note — a complete financial-adjustment trail.

## Scheduled pricing

`runtimeConfig.pricing.schedule` holds `{ price, annualPrice, effectiveAt }`.
The runtime resolver (`getEffectiveMonthlyPrice`) picks the latest scheduled
entry whose `effectiveAt <= now`. Marketing and the public API reflect the
effective price; a scheduled change "activates" automatically at read time.
Checkout uses `BillingPlan.price` (current), which the admin updates when
publishing a schedule — a cron that applies due schedules on save/publish is a
documented follow-up.
