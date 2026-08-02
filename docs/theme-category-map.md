# Theme Category Map — IMPLEMENTATION-25

Categories come from the existing `ThemeCategory` type; the marketplace filters
by them (dropdown) and shows the label via `CATEGORY_LABELS`.

## Category → themes (representative)

| Category | Themes |
|---|---|
| Creator | Creator Studio, Creator Dark, Creator Light, Creator Gold, Creator Neon, Creator Midnight, Creator Glass, Creator Bold, Creator Pro, Stream Vibe, Neon Dark |
| Gaming | Gaming Neon, Gaming Cyber, Gaming Matrix, Cyber Arena, Esports, Game Stream, Streaming Purple, Streaming Green |
| Business & Agency | Business Minimal, Corporate Blue, Corporate Modern, Corporate Black, Professional, Executive, Startup |
| Portfolio & Creative | Minimal Portfolio, Designer, Midnight Ocean, Photographer |
| Photography | Photography Light, Photography |
| Coach & Education | Coach, Academy, Mentor, Education, Education Academy |
| Music | Music Festival, Music Stage, Audio Creator, Podcast Studio, Voice |
| Luxury & Lifestyle | Luxury Champagne, Luxury Gold, Luxury Ivory, Royal Plum, Fashion |
| Food & Restaurant | Forest Canopy, Modern Restaurant, Fine Dining, Bistro, Restaurant |
| Health | Fitness Energy, Fitness |

## Marketplace UX (search/filter/sort)

- **Search** — name, description, tags.
- **Category** dropdown — from `themeRegistry.getCategories()`.
- **Tier** dropdown — Free / Starter / Pro / Business.
- **Unlocked only** toggle.
- **Favorites** toggle (⭐) — localStorage-backed.
- **Sort** — Featured (default) / Tier / Name A–Z / Recently Used.
- Badges: **Featured**, **Current**, **Locked · <Tier>**, tier chip.

Filtering is client-side over the full 50-theme catalog (fast; see
performance report). All data flows from `themeRegistry.getAll()`.
