# Theme Catalog

**Track:** RCCF-LAUNCH-TRACK-06 (Phase 7)
**Status:** Audited — recommendations documented, no destructive merge applied

## Audit result

The catalog (`src/lib/theme/themes/*`) contains ~50 themes. The 20 themes built
by the `catalog.ts` `makeTheme` helper are **pure palette swaps** over one shared
layout: identical surfaces (`#FAFAFA`/`#A1A1AA`/`#71717A`), identical typography,
identical border — only the 3–4 color values differ.

## Candidate palette groups (same layout, palette-only differences)

| Cluster | Themes (ids) |
| --- | --- |
| Gaming dark accents | `gaming-neon`, `gaming-cyber`, `gaming-matrix`, `streaming-purple`, `streaming-green`, `cyber-arena`, `game-stream`, `stream-vibe`, `creator-neon` |
| Luxury gold/black | `luxury-champagne`, `luxury-gold`, `royal-plum`, `luxury-ivory`, `fashion`, `executive`, `creator-gold` |
| Corporate blue | `corporate-blue`, `corporate-modern`, `corporate-black`, `professional` |
| Creator dark accent | `creator-dark`, `creator-gold`, `creator-neon`, `creator-midnight`, `creator-glass` |
| Portfolio/photography | `photography-light`, `photographer`, `minimal-portfolio`, `midnight-ocean`, `designer` |
| Education | `education-academy`, `academy`, `coach`, `mentor` |
| Restaurant | `forest-canopy`, `modern-restaurant`, `fine-dining`, `bistro` |

**Duplicate display names** (different ids):
- "Luxury Gold" — `com.creatos.luxury-champagne` (catalog) and
  `com.creatos.luxury-gold` (luxury.ts).
- "Corporate Blue" — `com.creatos.corporate-blue` (business.ts) and
  `com.creatos.corporate-modern` (catalog).

## Recommendation (NOT applied — migration risk)

Collapse each cluster into a single theme definition whose `variants` become
palette modes (the registry already models light/dark variants). **Preserve all
existing IDs** so applied `website.themePackageId` values keep resolving
(registry fallback already tolerates legacy slugs). This is a catalog refactor,
not a launch blocker — deferred to avoid touching every storefront's applied
theme. The `ThemeExperience` packs already differentiate the visual layers, so
the palette-only themes remain visually distinct on the experience layer.
