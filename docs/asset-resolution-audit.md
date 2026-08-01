# Asset Resolution Audit

**IMPLEMENTATION-13 · Phase D · 2026-08-01**

## Verdict

Prisma is never queried with `""`, `"null"`, `"undefined"`, or a malformed id.
Every asset lookup flows through one centralized boundary: `src/lib/media/resolve.ts`.

## The Production Error

```
Invalid UUID ""
```

### Root-cause chain

1. `src/config/hero.ts:24-25` defaulted `videoAssetId: ""` and `posterAssetId: ""`.
2. `src/actions/super-admin.actions.ts:106` seeded `hero_data` JSONB with the full default (including the empty ids).
3. `src/services/settings.service.ts:61` re-merges `defaultHeroData` at every read, so any hero row missing one of the keys yields `""` again.
4. `src/modules/tenant/application/website-aggregate.service.ts:198` passed `[uuid, ""]` to `mediaService.resolveUrls` whenever exactly one hero asset was set.
5. `src/lib/media/service.ts:279` filtered only `!= null`, so `""` passed through.
6. `src/lib/media/repositories/asset-queries.ts:20-21` ran `prisma.asset.findUnique({ where: { id: "" } })` → `PrismaClientValidationError: Invalid UUID ""`.

Every storefront ISR revalidation (`src/app/[domain]/page.tsx` `revalidate = 60`),
every publish and preview, and the builder live preview all call the aggregate —
so the error killed all four runtimes.

## All Query Sites Audited

| Site | File:line | Normalized? |
|---|---|---|
| `assetRepository.findById` | `asset-queries.ts:19` | ✅ now returns null for empty/invalid |
| `assetRepository.getReferenceCount` | `asset-queries.ts:88` | ✅ returns 0 |
| `mediaService.getPublicUrl` | `service.ts:268` | ✅ returns null |
| `mediaService.resolveUrls` | `service.ts:278` | ✅ filters empty/invalid |
| Aggregate brand avatar/banner | `website-aggregate.service.ts:182` | ✅ via `resolveUrls` |
| Aggregate hero video/poster | `website-aggregate.service.ts:198` | ✅ normalized before resolve |
| Profile `avatarAssetId`/`bannerAssetId` write | `profile/service.ts` | ✅ normalized before DB write |
| Media library actions (`getAsset`, `delete`, `purge`, `replace`) | `media-library.actions.ts` | ✅ guarded via `findById` |
| Processing queue / processor | `media/processing/*` | ✅ guarded via `findById`/`getStatus` |

## The Centralized Boundary

`src/lib/media/resolve.ts`:

```ts
normalizeAssetId(id)      // "" | undefined | null | "null" | "undefined" | invalid → null
filterValidAssetIds(ids)  // list of ids → only valid UUIDs
```

Rules:
- `""` → null (skip lookup)
- `undefined` → null (skip lookup)
- `null` → null (skip lookup)
- Invalid UUID → null (skip lookup)
- Valid UUID → pass through

## Defaults Fixed

`src/config/hero.ts` now defaults `videoAssetId: null` and `posterAssetId: null`
(was `""`). Settings/actions already normalize `""` → `null` before the JSONB
merge (`settings.actions.ts:85-87`), so stored data no longer recreates `""`.

## Regression Guard

`tests/unit/media-resolve.test.ts` covers the exact production input
(`[uuid, "", null, "null", undefined, "garbage"]` → `[uuid]`).
