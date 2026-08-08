# SEO Audit — RCCF-AUDIT-08

## Good

- Root `layout.tsx` metadata: `metadataBase`, title template `%s — CreatorStore`,
  description, `robots index/follow`, OG (`type/siteName/url/title/description`),
  Twitter `summary_large_image`.
- Home `OrganizationSchema` JSON-LD is honest (no fabricated claims).
- Pricing `Product` + `AggregateOffer` JSON-LD derived from the **runtime plans**
  (hidden/enterprise excluded) — accurate by construction.
- Storefront `generateMetadata` sets title/description/robots + canonical;
  inline JSON-LD.
- `sitemap.ts` revalidate 3600; includes home, features, pricing, showcase,
  about, faq, signup, blog, contact + up to 1000 tenant storefronts.
- `robots.ts` disallows `/admin/`, `/super-admin/`, `/agency/`, `/builder/`,
  `/api/`.

## Issues

| Severity | Finding | Fix | Complexity |
| --- | --- | --- | --- |
| High | **No OG/Twitter image** anywhere (`layout.tsx:37-50` has no `images`) — shares render as bare links | Add a 1200×630 brand OG image | Low |
| Medium | **Home + contact pages have no per-page metadata/canonical** (rely on root defaults) | Per-page title/description/canonical | Low |
| Medium | Sitemap omits `/purchase`, `/claim-invite`, `/terms`, `/privacy`, `/refund`, `/blog/guides` | Add them | Low |
| Medium | `/robots.ts` does not disallow `/onboarding`, `/purchase`, `/claim-invite`, `/dev/` | Add to disallow | Low |
| Medium | `PricingSchemaJsonLd` FAQ is 3 hardcoded Q/As (not the full FAQ) | Derive from the FAQ registry | Medium |
| Medium | FAQ page has no JSON-LD (`/faq` renders the same content the pricing schema partially covers) | Add `FAQPage` JSON-LD to `/faq` | Low |
| Medium | **Analytics: no production event tracking** — marketing events (`heroViewed`, `ctaClicked`, `sectionViewed`) are dev-only console logs (`lib/analytics/marketing.ts:9-15`); **no signup/funnel conversion events** wired (the `ACTIVATION_FUNNEL` events are defined but never called) | Wire real events + a real sink (GA4/Vercel events) before launch; you cannot measure conversion otherwise | Medium |
| Low | Headings: hero H1 present; section headings H2 — reasonable | — | — |
| Low | Alt text on marketing images present (the two showcase `<img>` have descriptive alt) | — | — |
| Low | Internal linking: footer + nav cover the key pages; blog guides link to 404s | Fix the guide links | Low |
| Low | Tenant storefronts in sitemap capped at 1000 | Paginate or accept cap | Low |

## Structured data verdict

Honest and runtime-accurate for pricing; organization schema is accurate. The
main SEO gap is shareability (no OG images) + no per-page metadata on the
highest-traffic pages + zero conversion analytics.
