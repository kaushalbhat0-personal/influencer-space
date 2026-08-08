# RCCF-AUDIT-09 — Builder Sidebar Counts & Canonical Section Metrics

**Status:** Read-only audit. No code changed.
**Result:** Root cause found. Every sidebar count is **block-instance count** (`section.slots.length`), not CMS item count. The canonical count already exists in the Website Aggregate and in `getBuilderOverview.contentCounts` — the sidebar simply never reads them.

---

## 1. Architecture diagram

```
                    ┌──────────────────────────────────────────────┐
                    │                CMS (Prisma)                  │
                    │  Product · GalleryImage · TimelineEvent ·   │
                    │  Testimonial · Faq · Offering · Game ·      │
                    │  ContentFeedItem · AffiliateLink · …        │
                    └──────────────┬───────────────────────────────┘
                                   │
        ┌──────────────────────────┼───────────────────────────────┐
        │                          ▼                               │
        │          websiteAggregateService.build()                 │
        │   (aggregate.products[] · gallery[] · timeline[] ·       │
        │    testimonials[] · faq[] · courses[] · services[] ·     │
        │    games[] · contentFeed[] · links[])                    │
        └─────────────┬───────────────────────────────┬────────────┘
                      │ getLivePreviewData()          │ getBuilderOverview()
                      ▼                               ▼
        ┌───────────────────────────┐   ┌──────────────────────────────┐
        │  InteractiveCanvas        │   │  BuilderWorkspace            │
        │  (aggregate → LayoutEngine│   │  overviewData.contentCounts  │
        │   → config.resolvedData)  │   │  (prisma .count per module)  │
        └───────────────────────────┘   └──────────────┬───────────────┘
                                                       │ passed to RIGHT panel only
        ┌──────────────────────────────────────────────┼───────────────┐
        │  BuilderSidebar → SectionManager  ◄──────────┘               │
        │  reads ONLY BuilderStore: section.slots.length  ✗ WRONG      │
        └──────────────────────────────────────────────────────────────┘
```

The **left sidebar** is completely disconnected from both the aggregate and the
overview counts. It reads only the Builder Store.

## 2. Current counting mechanism

`src/features/builder/components/section-manager.tsx:192`

```ts
slotCount: s.slots.length,   // ← number of BLOCK INSTANCES in the section
```

- Rendered at `section-manager.tsx:125-129`:
  `{section.slotCount} {contentLabel.toLowerCase()}`.
- `SectionData` (`:76-82`) carries `slotCount` + `moduleIds` (module ids of the
  slots) + `name`/`visible`.
- Every "Add Section" creates a section with **exactly one** slot
  (`builderStore.addSection(name)` + `builderStore.insertComponent(componentId, sec.id, 0)`, `:205-211`).
  The default seeded "Hero" section also has one slot (`BuilderStore.createDefaultPage`).
- Therefore `slotCount === 1` for every single-instance section → **"Products (1)"**.

This is **not** a hardcoded placeholder — it is the *real* block-instance count,
which is structurally almost always 1. It is a **mislabeled metric**: it counts
layout blocks, not CMS items.

## 3. Canonical counting mechanism (the correct source)

The **Website Aggregate** already exposes an array per repeatable section
(`website-aggregate.service.ts:158-257`):

| Section | Aggregate field | Count |
| --- | --- | --- |
| Products | `aggregate.products` | `.length` |
| Gallery | `aggregate.gallery` | `.length` |
| Timeline / Milestones | `aggregate.timeline` | `.length` |
| Testimonials | `aggregate.testimonials` | `.length` |
| FAQ | `aggregate.faq` | `.length` |
| Courses | `aggregate.courses` | `.length` |
| Services | `aggregate.services` | `.length` |
| Games | `aggregate.games` | `.length` |
| Content Feed | `aggregate.contentFeed` | `.length` |
| Links | `aggregate.links` | `.length` |

Additionally, **`getBuilderOverview` already computes canonical counts**
(`builder-overview.actions.ts:212-225`): `contentCounts.products/gallery/
testimonials/faq/timeline/games/contentFeed/links` (via `prisma.X.count(...)`),
loaded by the workspace at mount (`workspace.tsx:74-89`) and passed **only** to
the right panel (`BuilderProperties → WebsitePanel`). It lacks `courses` and
`services` (offerings) counts.

## 4. Duplicate logic report

| # | Source | What it counts | Used by |
| --- | --- | --- | --- |
| D1 | `websiteAggregateService` (`aggregate[base]`) | CMS items per section | Canvas/Storefront/Publish — canonical |
| D2 | `getBuilderOverview.contentCounts` | CMS items (prisma `.count`) | Right panel (completion/health) |
| D3 | Knowledge Runtime `aggregate-source.ts:97,107` | `productCount`/`galleryCount` (scoring) | Knowledge/Goals/Recommendations scoring |
| D4 | `SectionManager.slotCount = section.slots.length` | **block instances** | Left sidebar — **the bug** |

D1, D2, D3 all derive from the same CMS tables and agree. D4 is a *fourth,
different* metric and is the only one the sidebar reads. There is no
"duplicate counting logic" to remove in D1–D3 (each is a legitimate consumer);
the fix is to make the sidebar consume D1 (or D2) instead of D4.

## 5. Placeholder report

No `count: 1` / `items: 1` / `length || 1` / `defaultCount` placeholder exists in
the builder (`grep` over `src/features/builder`). The "1" is not a placeholder —
it is the genuine `slots.length` of a single-instance section. The label maps
(`CONTENT_LABELS`, `section-manager.tsx:43-49`) are cosmetic (e.g. Newsletter →
"Subscribers") but the number is wrong, not the label.

## 6. Performance analysis

- **Current sidebar render: 0 DB queries** (pure store read). But the builder
  already runs `getBuilderOverview` (≈16 count/read queries) **and**
  `getLivePreviewData` (full aggregate build ≈15+ queries) on every load; the
  canvas also refetches the aggregate on tab-focus (`interactive-canvas.tsx`).
- **Ideal (Phase 9):** consume the aggregate already fetched by
  `getLivePreviewData` → **zero extra queries**. `count = aggregate[base].length`
  needs no DB access and no new runtime.
- Optionally, `getBuilderOverview.contentCounts` is a second zero-extra-query
  source (already in the workspace) but it is fetched once at mount (stale after
  CMS edits) and lacks courses/services.

## 7. Recommended implementation (NOT yet implemented)

1. **Share the aggregate with the sidebar.** The workspace already loads the
   page; lift `getLivePreviewData` to the workspace (or a lightweight shared
   context/state) so both `InteractiveCanvas` and `SectionManager` read the same
   `content` payload. One fetch, two consumers — zero extra queries.
2. **Map section → count** via `baseOf(moduleId)`:
   `count = Array.isArray(aggregate[base]) ? aggregate[base].length : undefined`.
   Reuse the existing `baseOf` helper from `@/modules/section-presentation`
   (products/gallery/timeline/testimonials/faq/courses/services/games/
   contentFeed/links). No new runtime, no new counting code.
3. **Render the canonical count** in `SectionCard` instead of `slotCount`;
   show **no count** for static sections (Hero, Footer, Contact, Newsletter,
   Embed, Social) — matching Phase 3 of the audit (no meaningful CMS collection).
4. **Drop or repurpose `slotCount`** in `SectionData` (it is only used for the
   misleading badge).
5. **Optional de-duplication:** make `getBuilderOverview.contentCounts` derive
   from the aggregate (or add offerings counts) so D2 and D1 are one source.

## 8. Migration risk

- **Low.** Counts are presentational only. Section ids, module ids, slot
  structure, selection and visibility are untouched. The aggregate degrades
  gracefully (module failure → `[]` → count `0`), so a failed module shows `0`
  instead of breaking the sidebar — consistent with `shouldRenderSection`.

## 9. Regression risk

- **Low.** The sidebar still reads section names/visibility/actions from the
  store; only the numeric badge source changes. Sections without an aggregate
  collection (hero/footer/contact/newsletter/embed/social) display no count
  (they previously showed a meaningless "1").
- Aggregates are already computed for the canvas, so adding the sidebar as a
  consumer adds no requests and cannot increase storefront/publish load.
- UX: counts become live when the aggregate refetches (tab focus / canvas load);
  they are **not** real-time during a same-tab CMS edit, but neither are they
  today (today they never change). This is strictly an improvement.

## 10. Implementation roadmap

1. Lift `getLivePreviewData` to workspace/shared state (server action stays).
2. Add a pure `countForSection(moduleId, aggregate)` helper (baseOf → `.length`,
   `undefined` for static).
3. Pass aggregate counts into `SectionManager` (prop or context); render in
   `SectionCard`.
4. Remove `slotCount`; keep `moduleIds` (already used for edit links).
5. Optionally unify `getBuilderOverview.contentCounts` with the aggregate.
6. Add a unit test for `countForSection` + a builder-store test asserting the
   sidebar consumes aggregate counts (not slot length).

---

## Answers to the Success Criteria

- **Why every section shows "1"?** `SectionManager` sets
  `slotCount = section.slots.length` (block instances). Each section holds
  exactly one block, so the number is always 1 — it never represents CMS items.
- **Where does the count originate?** `section-manager.tsx:192`, from the
  Builder Store's `BuilderSection.slots` array.
- **Does the Website Aggregate already expose the canonical count?** **Yes.**
  `aggregate.products/gallery/timeline/testimonials/faq/courses/services/games/
  contentFeed/links` are real arrays; `.length` is the canonical count. It is
  already fetched for the canvas (`getLivePreviewData`).
- **Does the Layout Engine already compute it?** **Yes.** `composeSectionConfig()`
  sets `config.resolvedData` (the item array) and `config.hasContent` for every
  data section — `resolvedData.length` is the canonical count. The sidebar
  simply never runs the engine or reads its output.
- **Does duplicated logic exist?** The sidebar computes a *different* metric
  (block count). CMS item counts are computed in 3 places (aggregate, overview,
  knowledge runtime) — all agree; the fix reuses the aggregate, so no new
  counting logic is added and D4 is removed.
- **Cleanest implementation?** Make the sidebar consume the Website Aggregate
  (already loaded by the canvas) via a `baseOf(moduleId) → aggregate[base].length`
  helper. Zero new queries, zero new runtimes, one canonical source.

## Static sections (Phase 3)

Hero, Footer, Contact, Navigation and Newsletter have **no** aggregate collection
(newsletter has a `NewsletterSubscriber` table not exposed in the aggregate).
They should show **no count** (or a fixed "static" indicator), never a numeric
badge. Downloads / Resources / Community have **no** aggregate collection either
(no renderer) — they are N/A for counts.

## Runtime ownership (Phase 7)

The Knowledge/Goals/Experience/Business-Health/Recommendations/Analytics runtimes
**do not own** sidebar counts. They derive their own `productCount`/`galleryCount`
from the CMS for scoring (knowledge-runtime `aggregate-source.ts`). The builder
sidebar currently uses none of them and should not; the canonical count belongs
to the Website Aggregate.
