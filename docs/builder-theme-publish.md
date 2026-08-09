# Builder Theme & Publish

**Track:** RCCF-LAUNCH-TRACK-06 (Phase 2/3/4/10)
**Status:** Implemented

## The Builder is the canonical theme editor

- **Apply theme** → `workspace.handleApplyTheme` → `applyThemePackage` +
  `saveBuilderPages` (draft persists) → publish status refreshed → "Publish
  required" is shown.
- **Preview** → `onThemePreview` sets `previewThemeId` (temporary; never saved —
  IMPLEMENTATION-26).
- **Autosave** persists the applied theme; publish runs `performSave` then
  `publishWebsite`.
- **Live website only changes on Publish** — theme changes are part of the
  publish diff, never applied live directly.

## Entitlement (Phase 5 fix)

The Builder now receives the **canonical plan code** (`subscription.code` from
`getBuilderOverview`, not the display name). Previously the display name
("Creator Growth") resolved to `free`, so the theme picker locked **every**
premium theme for Grow/Scale users. Now:

- Creator Growth (`creator_grow`) → pro tier → premium themes unlocked.
- Creator Scale (`creator_scale`) → business tier → all themes unlocked.
- Free (`creator_launch`) → premium themes locked (correct).

Server-side apply remains authoritative (`themeEntitlementDecision` +
`capabilityService.can(plan, "premium_themes")`); no stale capability caches
exist (no `cache()`/`unstable_cache` in the capability path).

## Open in Builder

The Marketplace links to `/builder?theme=<id>`; the workspace reads the query
param and opens with the theme **previewed** (never applied). The creator then
applies + publishes.
