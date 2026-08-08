# Marketing SEO — RCCF-IMPLEMENTATION-73

## Implemented

| Item | Change |
| --- | --- |
| **OG/Twitter image** | Root layout now emits `openGraph.images` + `twitter.images` pointing at the real storefront screenshot (`marketing-assets/storefront/01-desktop.png`). |
| **Per-page metadata + canonical** | Home page now has its own title/description + canonical `/`; outcome-first copy. |
| **FAQPage JSON-LD** | `/faq` now emits structured FAQ data (was missing). |
| **Guide links** | `/blog/guides/*` 404s fixed with one `[slug]` route (`getting-started`, `connect-social-media`, `upi-payments`). |
| **Title/description** | Outcome-first: "Turn your content into a business" (no leading "AI"). |

## Already solid (from AUDIT-08)

- Organization JSON-LD honest.
- Pricing `Product` + `AggregateOffer` JSON-LD derived from the runtime
  (hidden/enterprise excluded).
- Storefront metadata + canonical + robots per tenant.
- `sitemap.ts` (revalidate 3600) + `robots.ts`.

## Remaining (roadmap)

- Sitemap: add `/purchase`, `/claim-invite`, legal pages; robots: disallow
  `/onboarding`, `/purchase`, `/dev/`.
- Contact page per-page metadata.
- A real brand OG card image (the storefront screenshot is a stopgap).
- Heading hierarchy + internal linking pass (already mostly good).
