# Legacy Cleanup Audit — v1.2.1

> **Date:** 2026-07-29
> **Type:** Repository-wide legacy audit
> **Status:** Complete — no architectural changes

---

## Summary

Audited every deprecated/legacy reference across the codebase. Classified into three categories: Keep (still referenced), Schedule for removal, and Already clean.

---

## Findings

### Deprecated But Still Referenced (Keep — Schedule Removal)

| File | Deprecation | Consumers | Plan |
|------|-------------|-----------|------|
| src/lib/theme/presets.ts | Legacy parallel ThemeRegistry | 2 files (via imports) | Remove when all theme lookups use registry-new.ts |
| src/lib/personalization/personalizer.ts | Legacy provisioning pipeline | 1 file (provisioning-service.ts) | Remove when provisioning uses IndustryRegistry |
| src/services/storage.service.ts | Superseded by MediaService | 1 file (affiliate.actions.ts) | Migrate to MediaService |
| src/services/settings.service.ts (patchThemeConfig) | Legacy theme write path | 1 action (settings.actions.ts) | Remove in v1.3 |

### Deprecated With Zero Consumers (Safe to Delete)

| File | Deprecation | Status | Action |
|------|-------------|--------|--------|
| src/lib/compatibility/theme/ThemeCompatibilityAdapter.ts | Builder theme adapter | Zero consumers | **Delete** |
| src/lib/compatibility/index.ts | Barrel export | Zero consumers | **Delete** |

### Legacy Models in Schema (Keep — Documented for Removal)

| Model | Status | Plan |
|-------|--------|------|
| WebsiteAgency | Legacy, still referenced by UI | Documented — remove in v1.3 |
| AgencySubscription | Dead (zero code references) | **Delete** (already planned in v1.2.1 backlog) |
| Subscription (legacy) | Being replaced by BillingSubscription | Keep — migration planned |

### Schema Fields — No Obsolete Fields Found

All schema fields are actively used by the application code or are legacy models documented above.

---

## Action Items

### Can Delete Now (Zero Risk)
1. src/lib/compatibility/ directory (2 files)
2. AgencySubscription model from Prisma schema

### Schedule for v1.3
1. Remove src/lib/theme/presets.ts 
2. Remove src/lib/personalization/personalizer.ts
3. Remove WebsiteAgency model
4. Remove SettingsService.patchThemeConfig()
5. Migrate StorageService usage to MediaService

### No Action Needed
- plan.legacyAliases in capabilities — used for backward plan code mapping
- Component registry deprecated field — active use
- BlueprintStatus / ThemeStatus "deprecated" — active enum values
- BillingPlan DEPRECATED status — active enum value
- Legacy Setting JSON fallback in AssignmentService — kept for migration safety