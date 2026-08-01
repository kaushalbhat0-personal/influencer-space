# Browser vs Aggregate

**IMPLEMENTATION-18 · Phase 6 · 2026-08-01**

## Claim

Compare **browser DOM → runtime trace → aggregate → database**, and identify
exactly one broken layer.

## The trace rule

- If the runtime trace says *Hero exists* but the DOM doesn't → runtime is wrong.
- If the DB says *Gallery exists* but the aggregate doesn't → aggregate is wrong.
- If the aggregate says *Gallery exists* but ComponentRenderer doesn't → renderer is wrong.

## Evidence

1. **Database**: hero title, 2 products, 3 gallery, 4 offerings, 3 timeline,
   2 games, 3 links all present (see `browser-vs-database.md`).
2. **Production runtime output** (`/test-creator-1` RSC payload): every section
   composed with `resolvedData: []` / `title: ""` → the aggregate was empty when
   the runtime composed it.
3. **Production builder server action**: the aggregate call fails with
   `Invalid prisma.asset.findUnique() … invalid input syntax for type uuid: ""`.
4. **Browser DOM**: renders the empty states — exactly what an empty aggregate
   produces.

## Layer-by-layer diagnosis

| Layer | State | Verdict |
|---|---|---|
| Database | content present | ✅ healthy |
| Aggregate | throws `Invalid UUID ""` → empty | ❌ **BROKEN** |
| Runtime (LayoutEngine + ComponentRenderer) | faithfully renders what it was given | ✅ healthy |
| Browser DOM | renders the runtime output | ✅ healthy |

**Exactly one broken layer: the aggregate.**

## Why the aggregate is broken on production

The deployed (committed, impl-12) aggregate resolves the hero's asset ids:

```
SettingsService.getHeroData()  → { ...defaultHeroData, ...storedHeroData }
stored hero_data has NO videoAssetId key
defaultHeroData.videoAssetId = ""   (committed code)
⇒ result.hero.videoAssetId = ""
if (videoAssetId || posterAssetId)  → resolveUrls(["", "97cabab1-…"])
committed resolveUrls: ids = assetIds.filter(id => id != null)   // keeps ""
getPublicUrl("") → findById("") → prisma.asset.findUnique({ id: "" })
⇒ Invalid input syntax for type uuid: ""   (THROWS)
```

Reproduced 1:1 against the shared DB (see `asset-resolution-proof.md`).

## Verdict

**Broken layer = Aggregate.** It fails to map DB → content because the deployed
code passes `""` into a Prisma asset lookup. The runtime, renderer and browser
are behaving correctly given the (empty) aggregate.
