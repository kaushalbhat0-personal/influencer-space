# Theme Workflow

**Track:** RCCF-LAUNCH-TRACK-06
**Status:** Implemented

## The ONE canonical flow

Before: two competing sources of truth — the Marketplace could apply a theme
directly to `website.themePackageId`, and the Builder could too.

After — **exactly one workflow**:

```
Theme Marketplace (BROWSE-ONLY)
  Browse · Preview · Compare · Favorite · Open in Builder
        │  (never mutates a website)
        ▼
Builder (?theme=<id> → previewed)
  Apply theme → Builder draft mutation
        │  autosave · publish-required
        ▼
Publish
        ▼
Live Website
```

Only the **Builder** applies themes. The Marketplace routes to the Builder
(`/builder?theme=<id>`), which opens with the theme previewed; the creator
applies → autosaves → publishes.

## Mutations eliminated

- **Marketplace apply removed** (`theme-marketplace-client.tsx`): no
  `applyThemePackage` call, no "Applied"/"Current" badges, no mutation notice.
  Buttons are now "Open in Builder".
- **Only** `workspace.handleApplyTheme → applyThemePackage` + `saveBuilderPages`
  writes `website.themePackageId`, and `publishingService.markChangesPending`
  flags the change as unpublished.

## Theme changes are unpublished draft changes

Applying a theme:
- persists the draft (builder autosave),
- flips `publishStatus` live → draft (`markChangesPending`),
- the Builder toolbar refreshes to "Publish required" (no stale "Published"),
- the live storefront only changes on **Publish**.

## Verification

`tsc`, `lint`, `next build` clean; **2104/2104** tests pass.
