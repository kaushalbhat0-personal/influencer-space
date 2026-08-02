# Builder ↔ Storefront Parity — IMPLEMENTATION-19 (Phase I)

## Principle

One renderer, one layout source, one aggregate.

- Builder canvas and storefront both render through
  `ComponentRenderer` → `HeroRenderer` (and every section renderer) with config
  produced by the **same** `LayoutEngine.composeSectionConfig`.
- The builder's live preview and the published storefront therefore resolve the
  identical section configs and render identical markup.
- `04b — Runtime parity` asserts the builder signature equals the storefront
  signature.

## What changed for parity

- **Hero layout is identical in both** — the `HeroRenderer` change (media first,
  `-mt-[30%] sm:-mt-[22%]` overlap) applies to the builder canvas and the
  storefront automatically because both use `HeroRenderer`.
- **Full-width hero** — the storefront previously wrapped every section in
  `mx-auto max-w-2xl px-4 pt-4`, which constrained the hero. The wrapper was
  removed; each renderer owns its container. The builder canvas already rendered
  sections full-width inside its device frame, so removing the storefront
  wrapper restored parity.
- **About dropped consistently** — `isDeprecatedSection()` runs in the same
  flattening used by both builder preview and publish, so neither side ever
  shows About.

## Verified

- I4: the builder canvas `<video>` src equals the storefront `<video>` src
  (both `.mp4`), and the canvas video reaches `readyState ≥ 1`.
- J5: About absent from builder; J1: About absent from storefront.
- J1: the overlap class (`-mt-[30%]` / `-mt-[22%]`) is present on the storefront.
- 04b: builder runtime signature == storefront runtime signature (22/22 suite).
