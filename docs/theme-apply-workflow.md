# Theme Apply Workflow — IMPLEMENTATION-26

## Apply (unlocked only)

```
Preview a theme (temporary)
  → Apply Theme
  → handleApplyTheme(themeId)
  → performSave(themeId, currentThemeId)     // applyThemePackage + saveBuilderPages
  → on success: currentThemeId = themeId, preview cleared, draft marked clean
  → Current badge moves to the applied theme
```

- **Applies the theme** (persists `Website.themePackageId`).
- **Saves the draft** (auto-save of builder pages) — no publish.
- Updates Builder state immediately.

## Ordering (no race)

The theme is **persisted first**, then the Current badge reflects it — a badge
can never appear before the theme is actually applied (Q3 verifies the DB).

## Locked themes

- Apply is never shown; the preview banner + **Upgrade to Apply** + upgrade
  dialog are shown instead.
- The dialog explains the required tier and links to `/admin/billing`
  (`Keep Previewing` returns to preview).
- No silent failure.

## Autosave

- Autosave (2s debounce), Ctrl+S and Publish all persist the **APPLIED** theme
  only — a previewed (locked/free) theme is never saved.

## Verified

- Q3: applying an unlocked theme changes the DB `themePackageId` to the clicked
  theme and moves the Current badge.
