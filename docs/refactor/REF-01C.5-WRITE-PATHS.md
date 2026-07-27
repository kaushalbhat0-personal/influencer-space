# REF-01C.5 — Write Path Verification

## Single Writer Analysis

| Domain | Writer 1 | Writer 2 | Writer 3 | Writer 4 | Status |
|--------|----------|----------|----------|----------|--------|
| **Identity (Brand)** | `profile/service.ts` (Profile page) | `provisioning-service.ts` (provisioning) | — | — | ✅ ONE admin writer + ONE bootstrap writer |
| **Identity (Setting.influencer_data)** | `settings.actions.ts` (Settings page) | `profile/service.ts` (Profile page) | `super-admin.actions.ts` | `provisioning-service.ts` | ❌ **4 writers** — primary violation |
| **Hero (hero_data)** | `settings.actions.ts` (Settings page) | `super-admin.actions.ts` | `provisioning-service.ts` | — | ⚠ 1 admin + 2 bootstrap |
| **Products** | `features/products/service.ts` | `provisioning/engine.ts` | — | — | ✅ ONE admin + ONE bootstrap |
| **Gallery** | `lib/gallery/service.ts` | — | — | — | ✅ ONE writer |
| **Links** | `actions/link.actions.ts` | `features/links/service.ts` | `services/affiliate.service.ts` | — | ❌ **3 active writers** (all admin, need consolidation) |
| **SEO** | `features/seo/service.ts` | `provisioning-service.ts` | `provisioning/engine.ts` | — | ⚠ 1 admin + 2 bootstrap |
| **Theme** | `theme/service.ts` | `website-repository.ts` | `settings.actions.ts` (theme_config) | — | ⚠ 3 writers (need consolidation) |
| **Layout** | `builder-service.ts` | `template/service.ts` | — | — | ✅ ONE editor + ONE bootstrap |

## Violations

1. **Setting.influencer_data has 4 writers**: Settings page, Profile page, Super-admin, Provisioning. The Profile page and Settings page both write overlapping identity fields to the same key with different field sets. This is the primary source of the "duplicate settings" bug.

2. **Links has 3 active admin writers**: `actions/link.actions.ts`, `features/links/service.ts`, and `services/affiliate.service.ts` all write to `AffiliateLink`. These should be consolidated to a single service.

3. **Theme has 3 writers**: `theme/service.ts` for package-level changes, `website-repository.ts` for color updates, and `settings.actions.ts` for JSONB-patched theme_config. These write to different tables but represent the same semantic data.

## Resolution for REF-01D

- Identity writes: consolidate to BrandRepository only. Deprecate Setting.influencer_data writes.
- Links: consolidate to `actions/link.actions.ts` as canonical. Deprecate other services.
- Theme: consolidate to `theme/service.ts` as canonical writer for Website.theme* columns.
