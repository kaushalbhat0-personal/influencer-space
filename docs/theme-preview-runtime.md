# Theme Preview Runtime — IMPLEMENTATION-26

## Preview is temporary and non-persisting

Clicking any theme in the Builder (free or locked) enters **Preview Mode**:

```
click theme
  → onThemePreview(themeId)
  → setPreviewThemeId(themeId)          (NO markDirty — draft untouched)
  → InteractiveCanvas themePackageId = previewThemeId ?? currentThemeId
  → LayoutEngine resolves the preview theme → canvas re-themes live
```

Preview **never**:
- marks the draft dirty,
- triggers autosave,
- saves pages,
- calls `applyThemePackage`,
- touches `Website.themePackageId`,
- affects publish.

Leaving preview (revert button or applying) restores the applied theme.

## Locked preview (Figma-style)

Locked themes are **previewable in the Builder** with a live canvas render.
A banner shows:

> `Previewing <Name> (<Tier>) — Upgrade to apply permanently.`

- **Allowed**: preview, live canvas render, device preview, compare.
- **Not allowed**: apply, save, publish, persist.

The Apply control is replaced by **Upgrade to Apply** → an upgrade dialog
(`Keep Previewing` / link to `/admin/billing`). Nothing silently fails.

## Runtime isolation

Preview uses the SAME one runtime (`LayoutEngine` → CSS vars) — there is no
separate preview engine. Only the `themePackageId` passed to the canvas
differs; it is never written.

## Verified

- Q2: locked theme previews (canvas vars change) AND the DB `themePackageId`
  is unchanged afterwards.
- Q4: after previewing a locked theme and reverting, the canvas returns to the
  original applied theme's vars.
