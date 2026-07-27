# REF-01A — Risk Matrix

## Per-File Deletion Risk

| File | Risk | Mitigation |
|------|------|-----------|
| `actions/product.actions.ts` | **LOW** — 0 importers, transitive dead | Grep for any remaining ref; if none, safe delete |
| `actions/upload.actions.ts` | **LOW** — 0 importers | Safe delete |
| `actions/team.actions.ts` | **LOW** — 0 importers | Safe delete |
| `actions/billing.actions.ts` | **LOW** — 0 importers | Safe delete |
| `actions/agency-provision.actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/products/actions.ts` | **LOW** — 0 importers, no barrel | Safe delete |
| `features/gallery/actions.ts` | **LOW** — 0 importers, no barrel | Safe delete |
| `features/faq/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/domains/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/courses/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/links/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/integrations/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/services/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/storefront/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/settings/actions.ts` | **LOW** — 0 importers | Safe delete |
| `features/gallery/service.ts` | **LOW** — only own tests reference it | Safe delete |
| `features/storefront/service-legacy.ts` | **LOW** — 0 references | Safe delete |
| `lib/products/service.ts` | **MEDIUM** — depends on `product.actions.ts` being truly dead | Delete `product.actions.ts` first; verify `BulkActionEngine` no longer references |
| `features/settings/service.ts` | **MEDIUM** — has workspace-settings merge prerequisite | Merge workspace-settings into `services/settings.service.ts` first |
| `lib/website/index.ts` (barrel) | **MEDIUM** — `showcase/service.ts` depends on it | Update showcase to use canonical source first |
| `lib/website/publish.ts` | **MEDIUM** — same barrel dependency | Same as above |
| `lib/website/service.ts` | **MEDIUM** — same barrel dependency | Same as above |
| `modules/.../publish-status-repository.ts` | **MEDIUM** — provisioning-service.ts depends on it | Update provisioning-service.ts first |

## Orphan UI Component Risk

All 8 orphan components: **LOW** risk. Zero importers, no barrel, no routes, no tests. Safe to delete individually or in batch.

## Overall Risk Rating

| Category | Count | Risk |
|----------|-------|------|
| Safe to delete (proven dead) | 25 files | LOW |
| Needs migration before delete | 7 files | MEDIUM |
| Must keep | ~15 files | N/A |

**No HIGH risk deletions identified.**
