# Runtime Trace — IMPLEMENTATION-18B

**2026-08-01**

## Storefront runtime trace (live)

Captured from the dev server while serving `/test-creator-1` (theme
`com.creatos.creator-studio`, creator `Farah Khan`):

```
Runtime Type:    storefront
Creator:         Farah Khan
Theme:           com.creatos.creator-studio

Aggregate counts
  hero: 1  products: 2  services: 2  courses: 2  gallery: 3
  faq: 2  testimonials: 2  timeline: 3  games: 2  contentFeed: 0  links: 3

Resolved sections: 12
Hidden sections:   0
Visible sections:  12
Rendered components: hero.default, about.default, products.grid, gallery.grid,
  services.default, courses.default, testimonials.default, faq.default,
  timeline.default, games.default, links.default, footer.default

Asset integrity
  invalid asset ids: 0   skipped assets: 0   module failures: 0

Runtime Signature: <sha256 of theme + layout + aggregate>
```

## Builder runtime trace

Builder canvas emits the identical counts + signature when the draft equals the
published layout (E2E `04b` asserts equality).

## Key invariants after 18B

- `hero` section config carries `name`, `profilePictureUrl`, `socialLinks`,
  `bio`, `cta*`, `liveBadge*`, media — all from `hero_data`.
- `about` section renders `identity.name/tagline/bio/avatarUrl` — all Hero-owned.
- `links` + `footer` sections carry `socialLinks` from `hero.socialLinks`.
- Profile (`account_data`) has no storefront effect.
- No invalid asset ids (media library video thumbnails no longer hit the image
  optimizer; uploads validate video magic bytes).
