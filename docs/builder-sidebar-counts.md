# Builder Sidebar Counts

**Track:** RCCF-IMPLEMENTATION-74 (builds on RCCF-AUDIT-09)
**Status:** Implemented

## What changed

The Builder left sidebar now shows **canonical CMS item counts** instead of
block-instance counts (which were always `1`).

| Before | After |
| --- | --- |
| Products (1) | Products · 12 products |
| Gallery (1) | Gallery · 43 images |
| Timeline (1) | Timeline · 8 events |
| Testimonials (1) | Testimonials · 5 testimonials |

## Canonical source: the Website Aggregate

`src/lib/builder/section-counts.ts` — `SectionCountResolver` is the **only**
place that resolves a section's item count. It consumes the Website Aggregate
(never Builder slots/blocks):

| Base id | Aggregate collection |
| --- | --- |
| `products` | `aggregate.products.length` |
| `gallery` | `aggregate.gallery.length` |
| `timeline` / `milestones` | `aggregate.timeline.length` |
| `testimonials` | `aggregate.testimonials.length` |
| `faq` | `aggregate.faq.length` |
| `services` | `aggregate.services.length` |
| `courses` | `aggregate.courses.length` |
| `games` | `aggregate.games.length` |
| `contentFeed` / `content_feed` | `aggregate.contentFeed.length` |
| `links` | `aggregate.links.length` |

Collections that don't exist in the aggregate (`bookings`, `downloads`,
`resources`, `community`, `newsletter`, embeds) and static sections resolve to
`null` → **no badge**.

## Zero extra queries

The aggregate is **already fetched** by the canvas (`getLivePreviewData` →
`websiteAggregateService.build`). The canvas shares it with the workspace via
`onLiveContentChange`; the workspace passes it to `BuilderSidebar →
SectionManager`. One aggregate build feeds both the preview and the sidebar —
**0 additional queries, 0 additional aggregate builds**.

## Live updates

Counts update automatically whenever the aggregate refetches (canvas mount +
tab-focus refetch), and whenever the section list changes (`store:changed`).
No manual refresh logic, no polling.

## Static sections

`STATIC_SECTION_BASES = { hero, about, navigation, nav, footer, contact }` —
never show a count.

## Status badges (refinement)

- **No badge** for permanent/static sections.
- **Count badge** for repeatable sections **only when count > 0** — `(0)` is
  never shown.
- **Draft dot** (subtle amber dot) when a section has presentation overrides in
  the draft (`config.presentation`) — i.e. custom title/description/visibility/
  hide-when-empty that isn't yet published. Derived from existing builder data.

## Sidebar is presentation-only

`SectionManager` no longer computes any count — it reads `itemCount` from the
resolver and renders badges. No Builder component inspects `slots.length` for a
count.
