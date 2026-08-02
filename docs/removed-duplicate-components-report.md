# Removed Duplicate Components Report

**IMPLEMENTATION-18B · Phase G · 2026-08-01**

## Verdict

Every storefront-visible identity field now has exactly ONE editable owner (Hero).
The Profile module no longer owns, reads, writes, or renders any identity field.

## What was removed / changed

| Duplicate | Before | After |
|---|---|---|
| Profile "Avatar" card (`MediaField` for avatar) | Profile wrote `Brand.avatarUrl/avatarAssetId` | **Removed** — profile picture owned by Hero (`hero_data.profilePictureUrl`) |
| Profile "Name / Tagline / Bio" inputs | Profile wrote `Brand.name/tagline/bio` | **Removed** — owned by Hero (Creator Identity card) |
| Profile "Social Links" editor | Profile wrote `Brand.socialLinks` | **Removed** — owned by Hero (`hero_data.socialLinks`) |
| Profile "Brand" colors + contact email | Profile wrote `brand_config` | **Removed colors** — contact email moved to `account_data` |
| `profileService.updateProfile` identity writes | wrote `Brand` identity fields | **Removed** — writes `account_data` only |
| `profileUpdateSchema` identity fields | accepted name/tagline/bio/avatar/socialLinks | **Removed** → `accountSettingsSchema` (account/business only) |
| Hero tagline/bio (duplicated between Hero Details + a new identity card) | two inputs | **One** — Creator Identity card owns tagline/bio |

## Files changed

- `src/features/profile/types.ts` — `ProfileData` → `AccountSettingsData` (identity fields removed).
- `src/features/profile/validators.ts` — `profileUpdateSchema` → `accountSettingsSchema`.
- `src/features/profile/service.ts` — writes `account_data` only; no Brand identity writes.
- `src/features/profile/actions.ts` — uses the account schema.
- `src/features/profile/components/profile-page.tsx` — Account Settings UI.
- `src/features/profile/__tests__/profile.test.ts` — account schema tests.
- `src/app/admin/profile/page.tsx` — passes `AccountSettingsData`.

## Obsolete identity storage (kept as migration fallback only)

- `Brand.name/tagline/bio/avatarUrl/avatarAssetId/socialLinks` — no longer edited
  by any admin surface; the aggregate prefers `hero_data`. The migration copies
  them into Hero. Dropping the columns is deferred to a schema migration.
