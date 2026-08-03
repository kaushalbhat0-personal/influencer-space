# Theme Publish Workflow — IMPLEMENTATION-26

## The corrected workflow

```
Preview (temporary, optional)
  ↓
Apply Theme        → persists theme + saves draft   (no publish)
  ↓
Auto Save Draft    → debounced autosave of the APPLIED theme + pages
  ↓
Publish            → publishes the draft (applied theme)
  ↓
Live Site
```

- **Preview** does NOT save.
- **Apply** saves the draft.
- **Publish** publishes the draft — exactly the same workflow as Builder
  sections.

## Publish never leaks a preview

- `handlePublish` calls `performSave(currentThemeId, currentThemeId)` — a
  previewed theme is never applied or published.
- The publish button's state and the draft-save status are independent.

## Status feedback (Phase I)

- Footer shows **Saving… / Unsaved changes / Draft saved** from the autosave
  lifecycle (existing).
- The Theme browser shows **Previewing <Name>** when in preview mode, distinct
  from "Draft saved".
- Applying shows "Saved" via `performSave`'s status message — never confused
  with Publish.

## Verified

- Q2/Q4: previews leave the applied theme untouched in the DB (nothing leaked).
- Q3: apply persists; the draft/publish path only ever sees the applied theme.
