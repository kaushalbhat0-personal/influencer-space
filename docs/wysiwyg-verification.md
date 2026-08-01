# WYSIWYG Verification

**IMPLEMENTATION-14 · Phase B, C, D & G · 2026-08-01**

## Verdict

The Builder Canvas IS the storefront renderer, so every layout interaction is
instantly visible — no Save, Publish, Preview, or Reload.

## Mechanism — one store, reactive canvas

1. **Every builder action mutates the single `BuilderStore` and emits
   `store:changed`.** The full action inventory is covered:

   | Action | Store method | emits `store:changed` |
   |---|---|---|
   | Add section | `addSection` → `insertComponent` | ✅ |
   | Move section | `reorderSections` | ✅ |
   | Drag / drop | `startDrag` / `endDrag` / `cancelDrag` | ✅ |
   | Duplicate | `duplicateSection` / `duplicate` | ✅ |
   | Delete | `removeSection` / `removeElement` | ✅ |
   | Hide/show | `setSectionVisibility` | ✅ |
   | Layout / spacing / animation | `updateBlockConfig` (presentation keys) | ✅ |
   | Theme | workspace theme apply → `markDirty` | ✅ |
   | Responsive | `setDevice` / `setZoom` | ✅ |
   | Inspector selection | `select` / `selectRange` / `selectAll` / `clearSelection` | ✅ |
   | Copy / cut / paste | `copy` / `cut` / `paste` | ✅ |
   | Undo / redo | `undo` / `redo` | ✅ |
   | Hydrate | `hydrate` | ✅ |
   | New page | `addPage` | ✅ |

2. **The canvas subscribes to `store:changed` and re-renders immediately.** The
   sidebar does the same — the 1500ms polling is gone.

3. **The canvas recomputes through the canonical runtime on every change:**
   `builderStore.serialize()` → `builderPagesToLayoutSnapshot` →
   `layoutEngine.resolve()` → `ComponentRenderer`. Because this is the same
   path the storefront uses, what you see is exactly what will be published.

4. **Pure calculations are memoized** (`useMemo` keyed on a layout signature);
   **store state is never memoized** (Phase J). Structural noise (selection,
   hover) does not recompute the layout unless the signature changed.

## Live CMS (Phase D)

The builder never owns content. The canvas loads the live aggregate via the
same `websiteAggregateService.build()` the storefront uses and **refetches it
when the tab regains focus** (`visibilitychange` / `focus`). A content edit made
in the Dashboard appears in the Builder immediately when you return to the
builder tab — no publish, no reload, no preview.

## Manual verification matrix

| Interaction | Expected canvas change |
|---|---|
| Move Products above Hero | Sections reorder instantly |
| Move Hero below About | Reorders instantly |
| Hide Gallery | Gallery section disappears |
| Add a section from the sidebar | Section + renderer appear instantly |
| Change theme in the right panel | Colors/typography update |
| Change alignment / animation in inspector | Section restyles instantly |
| Toggle Desktop/Tablet/Mobile | Canvas viewport resizes |
| Duplicate a section | Copy appears instantly |
| Undo / redo | Restores previous layout instantly |
| Paste a copied section | Appears instantly |
| Edit a product in Admin, return to Builder | Product data updates on focus |

## No-preview guarantee

There is no separate preview renderer and no preview snapshot. The only
"preview" is the storefront `?preview=true` route, which renders the **draft
layout + live content through the exact same runtime** as the builder canvas and
the published storefront.

## Regression guard

`src/features/builder/__tests__/builder-store.test.ts` exercises store actions;
`tests/unit/builder-presentation.test.ts` verifies the presentation-only
contract; the canvas's `store:changed` subscription is exercised at runtime.
