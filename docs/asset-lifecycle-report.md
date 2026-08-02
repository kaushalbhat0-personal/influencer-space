# Asset Lifecycle Report — IMPLEMENTATION-19 (Phase E)

## Model

- **`Asset`** carries `referenceCount` (denormalized) and `status` / `processingStatus`.
- **`AssetReference`** rows record each usage: `assetId, tenantId, entityType, entityId, field`.
- References are written on upload when `entityType/entityId` are supplied
  (Hero fields, products, gallery, timeline, games) and removed on dereference.

## Where an asset is used — human labels + navigation

New action `resolveAssetReferences(assetId)` resolves each `AssetReference` into
a human-readable label and a deep link:

| entityType | label | href |
|---|---|---|
| hero / field `videoUrl` | Hero Video | `/admin/settings` |
| hero / field `posterUrl` | Hero Poster | `/admin/settings` |
| hero / field `backgroundUrl` | Hero Background | `/admin/settings` |
| hero / field `profilePictureUrl` | Profile Picture | `/admin/settings` |
| profile | Profile Picture | `/admin/settings` |
| product | Product: \<name\> | `/admin/products` |
| gallery | Gallery: \<title\> | `/admin/gallery` |
| timeline | Timeline: \<title\> | `/admin/milestones` |
| game | Game: \<name\> | `/admin/games` |

The detail panel renders these as clickable links ("Used In →").

## Delete prevention

- `mediaService.delete()` throws `MediaReferenceError` when `referenceCount > 0`.
- The UI replaces the Delete button with: *"This asset is used in N places.
  Replace it instead of deleting."* — and always offers **Replace**.

## Verification

- J4: opening a referenced asset shows "Used In", Replace is offered, and the
  delete-with-reference warning is present.
- Hero video + profile picture references were verified present in
  `AssetReference` (entityType `hero`).
