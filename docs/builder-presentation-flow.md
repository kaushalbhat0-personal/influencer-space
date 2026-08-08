# Builder Presentation Flow

**Track:** RCCF-LAUNCH-TRACK-04 / 04B

How a creator edits presentation and where it lands — Builder → Preview →
Publish → Storefront → future edits.

## 1. Editing (Builder)

- **Panel:** `Section Presentation` in the right rail (`website-panel.tsx`)
  mounts `section-presentation-panel.tsx`. It appears when a section is selected
  (`builderStore.getSelectedSlot()`).
- **Fields:** Title (override), Description (override), Visible, Hide title,
  Hide when empty — each with a **Reset** button; a **Reset all** button clears
  every override.
- **Store actions** (`src/lib/builder/store.ts`):
  - `updateSlotPresentation(slotId, patch)` — merges into `config.presentation`.
  - `resetSlotPresentation(slotId, property?)` — removes one property, or all
    when no property is given (Phase 8). No data loss; canonical ids untouched.

## 2. Preview (live, no publish)

`interactive-canvas.tsx` subscribes to `store:changed`, serializes the store,
runs `builderPagesToLayoutSnapshot()` → `layoutEngine.resolve()` → registry
renderers. Title/description/visibility/hide-title/hide-when-empty all reflect
instantly because the preview is the *same runtime* as the storefront and the
draft config is part of the layout snapshot.

## 3. Publish (persistence)

`config.presentation` is part of the slot config and therefore of the draft
(`Block.config` JSON) and the published snapshot (`layout.sections[].config`
inside `PublishSnapshot`), exactly like Theme, Layout, and Navigation. Content
is still excluded from the snapshot — presentation travels with the blueprint,
content stays live in the CMS.

## 4. Storefront rendering

1. `LayoutEngine.composeSectionConfig` resolves presentation into
   `resolvedTitle`, `description`, `hideTitle`, `visibilityMode`, `hasContent`.
2. `shouldRenderSection` decides whether the section renders at all.
3. `SectionHeading` renders the heading honoring `hideTitle`/description; Hero,
   Contact and Newsletter use the same resolution (no raw `config.presentation`).
4. JSON-LD/schema keeps using the **canonical** section name — never the
   presentation title — so there are no duplicate H2s and no SEO regressions.

## 5. Future edits

Re-editing the Builder loads the draft (including `config.presentation`), the
panel shows current overrides, and Reset returns to canonical defaults. The
published snapshot is regenerated on the next publish.

## Category-driven defaults (Phase 7)

Generation seeds `titleOverride` only, driven by the existing knowledge
category packs (`resolvePack`). See
[implementation-79b-report.md](./implementation-79b-report.md) for the mapping.
