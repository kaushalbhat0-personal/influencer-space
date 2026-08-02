# Asset Lifecycle Report — IMPLEMENTATION-23

## The problem (PART 12)

The Media Library marked the **Hero Video as "Unused"** even though the Builder
and Storefront rendered it. The old "Used" badge came from the denormalized
`Asset.referenceCount` / `AssetReference` rows, which are only written when an
upload passes an `entityType`/`entityId`. Runtime references (hero_data asset
ids, product image urls, builder block configs, published snapshots) were never
consulted — so the badge, details, and delete protection could all disagree.

## The single resolver

`resolveAssetUsage({ tenantId, assets })` inspects **every** runtime reference
live and returns `{ used, usages: [{label, href}] }` per asset:

- hero_data → Hero Video / Hero Poster / Hero Background / Profile Picture
- Brand → Profile Picture / Banner
- Gallery → "Gallery: <title>"
- Products → "Product: <name>" (+ images array)
- Affiliate Links, Timeline, Games
- Offerings → "Course: <title>" / "Service: <title>" (metadata)
- Content Feed
- Testimonials / FAQ (Setting JSON)
- Builder Draft (Page → Section → Block config, walks JSON for AssetId/Url)
- Published Snapshot (walks JSON)
- Navigation / website themeConfig

Matching is by **asset id** and by **public URL**, so both id-storing and
url-storing entities are covered. Batched — one scan per request, no N+1.

## Consumers (all agree)

| Surface | Source |
|---|---|
| Media Library Used/Unused badge | `listAssets` → resolver `used` |
| Asset Details "Used In" | `getAsset` / `resolveAssetReferences` → resolver `usages` |
| Delete protection | `deleteAssetsBulk` → resolver `used` |
| Runtime aggregate | aggregate hero resolves the same asset ids |

## Proof

- M8: Hero video badge == Used; "Used In" lists **Hero Video** (builder +
  storefront render it).
- M9: Hero poster badge == Used.
- M10/M3: deleting the Hero video is blocked; "Used In" lists Hero Video.
- After any deletion, remaining Used/Unused badges are recomputed live (no
  stale counts).

## No cached booleans

There is no stored "used" flag and no estimated count. `referenceCount` remains
informational; the resolver is the source of truth.
