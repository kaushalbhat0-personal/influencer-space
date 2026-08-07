# Recommendation Registry

RCCF-EPIC-06 — Phase 1.

`src/modules/recommendation-runtime/domain/registry.ts`

One canonical registry of recommendations. Every entry declares:

- `id` — e.g. `CREATE_FIRST_PRODUCT`
- `title` + `description`
- `category` — `critical | high_impact | quick_win | growth | optimization | advanced`
- `priority` (1–5)
- `estimatedTime` (minutes)
- `expectedImpact` — per storefront-dimension deltas (Knowledge +5, SEO +8, Trust +4, …)
- `prerequisites` — recommendation ids that must be complete first
- `goalAffinity` — goalId → affinity (0–1)
- `knowledgeDependencies` — knowledge-runtime field ids this closes
- `successDependencies` — related success milestone ids
- `storefrontDimensionsAffected`
- `dashboardAction` / `builderAction` / `adminHref`
- `when(ctx)` — trigger predicate (pure)
- `done(ctx)` — completion predicate (pure, auto-completes)
- `reason(ctx)` — why it is recommended

## The 25 recommendations

| id | category | closes |
| --- | --- | --- |
| `ADD_LOGO` | quick_win | brand.logo |
| `CONFIGURE_BRAND` | quick_win | brand.colors |
| `WRITE_ABOUT` | quick_win | brand.bio |
| `ADD_SOCIAL_LINKS` | quick_win | social.links |
| `UPLOAD_HERO_IMAGE` | critical | media.heroMedia |
| `CREATE_FIRST_PRODUCT` | critical | commerce.products |
| `CREATE_DIGITAL_PRODUCT` | optimization | product images + descriptions |
| `CREATE_FIRST_SERVICE` | high_impact | commerce.services |
| `ENABLE_BOOKINGS` | high_impact | commerce.bookings |
| `CREATE_COURSE` | growth | commerce.courses |
| `CREATE_AFFILIATE_PRODUCT` | optimization | social.affiliateLinks |
| `UPLOAD_GALLERY` | high_impact | content.gallery |
| `ADD_TESTIMONIALS` | high_impact | trust.testimonials |
| `CREATE_FAQ` | growth | content.faq |
| `ADD_TIMELINE` | growth | trust.timeline |
| `ENABLE_SEO` | high_impact | seo.title |
| `COMPLETE_CONTACT` | high_impact | contact.email |
| `CONNECT_DOMAIN` | growth | business.domain |
| `CONNECT_YOUTUBE` | growth | social.feed |
| `ENABLE_NEWSLETTER` | optimization | declared `newsletter_enabled` |
| `ENABLE_COMMUNITY` | growth | declared `community_hub` / feed |
| `ADD_REFUND_POLICY` | optimization | declared `refund_policy` |
| `PUBLISH_SITE` | critical | publish state live |
| `ENABLE_ANALYTICS` | advanced | analytics events |
| `VERIFY_EMAIL` | advanced | declared `email_verified` |

## Completion signals

Most recommendations auto-complete when the underlying knowledge field becomes
complete (a success milestone completing the underlying work also completes the
recommendation — Phase 10, no duplicate logic). Platform-level recommendations
(`PUBLISH_SITE`, `ENABLE_ANALYTICS`, `VERIFY_EMAIL`, `ADD_REFUND_POLICY`,
`ENABLE_NEWSLETTER`, `ENABLE_COMMUNITY`) use their own deterministic signals
and can also be marked done/dismissed via history (Phase 11).
