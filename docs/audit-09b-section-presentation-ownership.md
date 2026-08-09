# Audit 09B — Section Presentation Ownership

**Track:** RCCF-AUDIT-09B
**Type:** READ-ONLY architecture audit (Requirement A)
**Status:** No code changed

## Purpose

Determine whether creators can rename section presentation headings
(Products → Menu, Gallery → Portfolio, etc.) **outside the Builder**, and
whether the existing `config.presentation` runtime is complete.

## What exists (verified against current source)

### Presentation runtime — complete

| Concern | Status | Evidence |
| --- | --- | --- |
| `titleOverride` type | ✅ | `SectionPresentation` in `src/modules/section-presentation/domain/types.ts:5-16` (`titleOverride`, `descriptionOverride`, `hideTitle`, `visible`, `hideWhenEmpty`) |
| Persists | ✅ | `builderStore.updateSlotPresentation` → `src/lib/builder/store.ts:252-266` → `saveBuilderPages` → Prisma `Block.config` JSON |
| Autosaves | ✅ | same store path as all builder drafts (workspace autosave effect) |
| Publishes | ✅ | `builderPagesToLayoutSnapshot` carries `slot.config` verbatim (`src/lib/builder/layout.ts:30`); published snapshot layout includes it |
| Storefront renders it | ✅ | `LayoutEngine.composeSectionConfig` (`LayoutEngine.ts:359-377`) resolves to `config.resolvedTitle`; renderers render via `SectionHeading` (`renderers.tsx:54-63`) |
| JSON-LD canonical names | ✅ | `LayoutEngine.buildJsonLd` uses `identity.name` and a hardcoded `` `${identity.name}'s Products` `` (`LayoutEngine.ts:159,170`) — canonical names, never the presentation title |
| `hideTitle` | ✅ | honored by `SectionHeading` + resolution (`resolver.ts`) |
| `hideWhenEmpty` | ✅ | enforced in 3 places: storefront page filter (`page.tsx:183`), builder canvas filter (`interactive-canvas.tsx:216`), per-renderer `useVisibility` (`renderers.tsx:32-34`) |
| `visible` | ✅ | resolved to `visibilityMode` (`resolver.ts:70-74`); section filter honors it |

### The ONLY editing surface is the Builder

The sole editor of `config.presentation` is:

**`src/features/builder/components/section-presentation-panel.tsx`** — Title,
Description, Visible, Hide title, Hide when empty checkboxes + per-property
Reset + Reset all.

- Mounted in the right-hand properties panel (`properties.tsx:18-20` → `website-panel.tsx:74` → `workspace.tsx:316-328`).
- Only visible **when a section is selected** in the Builder (`getSelectedSlot()`).
- Route: `/builder`.

### Creator-facing surfaces outside the Builder

**None.** A full-repo search for `presentation | titleOverride | hideTitle |
hideWhenEmpty | "Section Presentation"` under `src/app` found no admin,
dashboard, website-settings, or content-management surface that edits section
presentation.

Admin pages that touch sections are **content CRUD or links only**:
- `/admin/website/pages` — read-only page list + "Edit in Builder" link.
- `/admin/website/navigation` — nav editor (labels, order, visibility, external links).
- `/admin/website/seo` — placeholder ("coming soon").
- `/admin/products`, `/admin/gallery`, `/admin/games`, `/admin/milestones`,
  `/admin/testimonials`, `/admin/services`, `/admin/courses`, `/admin/faq`,
  `/admin/links`, `/admin/settings/content` — content collections.

### Discoverability (Part 1B)

- **No "Edit Heading" affordance exists anywhere.**
- The Builder's `SectionCard` (`section-manager.tsx:178-183`) shows an
  external-link icon that deep-links to the content admin pages
  (`EDIT_LINKS` map, `section-manager.tsx:33-43`) — that is "Manage content",
  not "Edit heading".
- The presentation panel itself has no edit-icon entry point; it appears only
  when a section is already selected inside the Builder.

## Case classification

- **Case 1 (implemented outside Builder):** none.
- **Case 2 (only inside Builder):** section presentation — the Builder panel
  is the single editing surface.
- **Case 3 (runtime exists, no usable UI):** the runtime is fully usable, but
  only from inside the Builder panel. N/A outside the Builder.
- **Case 4 (hardcoded names):** the presentation **values** are not hardcoded
  (they flow from `config.presentation`), but there is **no creator UI** to
  edit them other than the Builder panel.

## Key gaps

1. **No creator-facing presentation editing surface** outside the Builder —
   Requirement A's critical need is unmet.
2. No edit-icon/heading affordance; "Edit Heading" would be a new action.
3. `SectionPresentation` is enforced only by `as` casts
   (`store.ts:259`, `section-presentation-panel.tsx:21`, `LayoutEngine.ts:362`)
   — no runtime schema validation of the stored `config.presentation` shape.
4. Hero `titleOverride` replaces the hero identity H1/H2 (`LayoutEngine.ts:366-367`)
   — a rename on hero behaves differently than on other sections.
5. Dead code: `updateBlockConfig` (`store.ts:361-381`) has zero callers;
   `settingsPanel` in `ComponentDefinition` (`registry/components/types.ts:67`)
   is never implemented.

## Reuse path (for a future Phase 1)

The runtime, persistence, publish, and storefront render are already complete
and generic. Adding a creator-facing surface (dashboard/admin) needs only:
- a server action wrapping `config.presentation` updates per section/module,
- an admin UI reading/writing the same `Block.config.presentation` shape.

No new runtime is required.

## Files inspected

- `src/modules/section-presentation/domain/types.ts`
- `src/modules/section-presentation/application/resolver.ts`
- `src/modules/section-presentation/application/runtime.ts`
- `src/features/builder/components/section-presentation-panel.tsx`
- `src/features/builder/components/properties.tsx`
- `src/features/builder/components/section-manager.tsx`
- `src/features/builder/components/workspace.tsx`
- `src/lib/builder/store.ts`, `src/lib/builder/presentation.ts`, `src/lib/builder/layout.ts`
- `src/lib/storefront/layout-engine/LayoutEngine.ts`
- `src/lib/renderer/index.tsx`, `src/lib/renderer/data-bound.tsx`
- `src/app/[domain]/page.tsx`
- `src/app/admin/website/pages/page.tsx`, `navigation/`, `seo/page.tsx`
- `src/lib/registry/components/types.ts`
