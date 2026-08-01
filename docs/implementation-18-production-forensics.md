# IMPLEMENTATION-18 — Production Forensics

**Status: ROOT CAUSE PROVEN**
**Date: 2026-08-01**
**Target: https://influencer-space-alpha.vercel.app/**
**Account: testcreator1@gmail.com / admin123**

---

## Executive conclusion

Production does not run the code that is on disk.

Vercel builds from **`git HEAD` (commit `0fbe8cf`, IMPLEMENTATION-12)**. The
fixes made in IMPLEMENTATION-13–17 are **uncommitted working-tree changes** and
were never deployed. The deployed (committed) code contains the exact defects
that earlier implementations fixed locally:

1. `src/config/hero.ts` → `defaultHeroData.videoAssetId = ""`
2. `src/lib/media/service.ts` → `resolveUrls()` keeps `""`
3. `assetRepository.findById()` → passes `""` to `prisma.asset.findUnique({ where: { id: "" } })`
4. → **`Invalid input syntax for type uuid: ""`** — reproduced 1:1 against the shared production database.

That single throw breaks every runtime that builds the aggregate:

- **Builder** → `getLivePreviewData` fails → canvas cannot render → **empty builder**.
- **Storefront** → `mergeLiveContent` catches the throw and falls back to the
  published snapshot, whose content is **empty by design** (written by the newer
  publish pipeline) → **placeholder content**.
- **Publish** → the aggregate throw can abort publish → **intermittent publish failure**.

A secondary committed-code defect (`getBuilderOverview`:
`Object.keys(undefined)` on the absent `"hero"` setting → "Cannot convert
undefined or null to object") also appears on production.

---

## Browser truth (source of truth)

Captured with Playwright 1.61 + curl against production.

| Page | Browser result |
|---|---|
| `/admin/login` | ✅ renders "Admin Login"; login works (session cookie set, redirects to `/admin/dashboard`) |
| `/admin/dashboard` | ✅ "Welcome back, Test Creator 1" |
| `/builder` | ⚠️ workspace + sidebar render (12 sections) but **canvas absent** (`[data-testid="builder-canvas"]` count = 0) |
| `/test-creator-1` | ❌ renders the 12-section **layout** with **all placeholder content** ("Add products in Dashboard", "Add your services", …) and `© — CreatorStore` (empty name) |

Production storefront **HTML** contains `data-runtime-signature`? **No**.
Production **DOM** contains any real content (product name, gallery, games)? **No**.

## Network truth (server actions on production)

`POST /builder` server-action responses:

```
1:{"success":true,"pages":[…12 sections…]}                              ← layout loads (DB reachable)
1:{"success":false,"error":"TypeError: Cannot convert undefined or null to object"}
1:{"success":false,"error":"\nInvalid `prisma.asset.findUnique()` invocation:\n\n\nInvalid input value: invalid input syntax for type uuid: \"\""}   ← THE ERROR
```

`GET /test-creator-1` RSC payload (the server truth):

```
hero.default    props { title:"", subtitle:"", description:"" }
products.grid   props { resolvedData: [], resolvedTitle:"Products" }
gallery.grid    props { resolvedData: [] }
services/courses/testimonials/faq/games/links …  resolvedData: []
```

The server sent an **empty aggregate** to the browser.

## Database truth (shared Supabase project `flhllvzzbtkfrcrajicq`)

| Module | DB rows (tenant) | Production DOM |
|---|---|---|
| Hero | title `Farah Live kz8r`, tagline `Picture abhi baaki hai mere dost` | empty |
| Products | `test` ₹650, `test product 2` ₹852 (PUBLISHED) | "Add products in Dashboard" |
| Gallery | Studio Session, Behind The Scenes, Live Stream | "Add images to your gallery" |
| Services/Courses | 4 offerings (2 course, 2 coaching) | "Add your services/courses" |
| Timeline | 3 events | "Add milestones" |
| Games | BGMI, Valorant | "Add your games" |
| Links | YouTube, Instagram, X/Twitter | "Add your social links" |
| Testimonials / FAQ | 2 / 2 | "Add testimonials / questions" |

Latest live snapshot **v6** (written by the newer local publish pipeline):
`content.products.length = 0`, `content.identity.name = ""`, `layout.sections = 12`.

**Browser ≠ Database on production.** The DB is identical to local; the browser
renders none of it.

## Root cause proof chain

```
Production build = git HEAD (impl-12)                       [deployed chunk page-a39ff2a98380bd96.js ≠ local page-e88659a8149c2714.js]
Committed defaultHeroData.videoAssetId = ""                 [git show HEAD:src/config/hero.ts]
Stored hero_data has NO videoAssetId key
SettingsService.getHeroData merges defaults → videoAssetId = ""
Aggregate: if (videoAssetId || posterAssetId) → resolveUrls(["", "97cabab1-…"])
Committed resolveUrls filters id != null (keeps "")         [git show HEAD:src/lib/media/service.ts]
getPublicUrl("") → findById("") → prisma.asset.findUnique({ id: "" })
→ Invalid input syntax for type uuid: ""                    [REPRODUCED 1:1]
websiteAggregate.build() throws
Builder: getLivePreviewData fails → canvas empty
Storefront: mergeLiveContent falls back to empty snapshot → placeholders
Publish: aggregate throw can abort publish
```

## Minimal fix (already present in the working tree, needs deploy)

1. `src/config/hero.ts`: `videoAssetId: ""` → `null` (and `posterAssetId`).
2. `src/lib/media/resolve.ts` (`normalizeAssetId`/`filterValidAssetIds`) and
   `resolveUrls`/`getPublicUrl`/`findById`: reject `""`, `undefined`, malformed
   ids before Prisma.
3. `src/actions/builder-overview.actions.ts`: `heroVal != null` guard.

Each is verified locally (see `runtime-data-audit.md`); deploying the working
tree makes production converge with local.

## Supporting reports

- `browser-vs-runtime.md` · `browser-vs-database.md` · `browser-vs-publish.md` ·
  `browser-vs-aggregate.md` · `browser-vs-builder.md` · `environment-diff.md` ·
  `network-diff.md` · `runtime-diff.md` · `asset-resolution-proof.md` ·
  `cache-proof.md` · `root-cause-matrix.md`
