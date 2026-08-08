# Marketing Launch Alignment — RCCF-IMPLEMENTATION-73

Implements the RCCF-AUDIT-08 roadmap: aligns the marketing site with the
platform that actually exists — **without redesigning** the site or its
architecture. The theme: honesty and clarity, not hype; the AI is the mechanism,
not the headline.

## Implemented

| Phase | What changed |
| --- | --- |
| 0 — Audit verification | All AUDIT-08 findings verified still applicable (fabricated About stats, /faq fee contradiction, agency "coming soon", broken screenshots, deceptive CTA, dev-only analytics, framer-motion on the storefront) |
| 1 — Truth alignment | `/faq` fees/price fixed (Scale ₹1,999; "creators keep 100% of every sale"); "free plan" → "15-day free trial"; agency billing page now reflects the real subscription-sharing runtime |
| 2 — Hero | Outcome-first: value bullets (Keep 100% of every sale · Launch in minutes · Sell products/services/courses/bookings · Built for Indian creators); CTA "Build My Storefront — Free"; fake mockup replaced with a real storefront screenshot |
| 3 — Smart platform | New `SmartPlatform` section — six real capabilities in creator language (no runtime names) |
| 4 — Trust | Fabricated About stats replaced with honest product facts (100% revenue, 15-day trial, 8 platforms, <2min); "Join thousands" → honest line; empty trust components removed from the home page |
| 5 — Showcase | Broken storefront screenshot paths fixed; "View storefront" → "Explore demo storefronts" |
| 6 — Pricing | Runtime-derived agency revenue example ("10 clients on Growth → ~₹1,398/mo recurring") in the Partner panel |
| 7 — Conversion | All creator CTAs → `?persona=creator`; partner CTAs → `?persona=partner`; pricing checkout CTAs carry `?plan=` + `persona` |
| 8 — Journey | New `CreatorJourney` section mirrors the real onboarding pipeline (paste → understand → store → customize → launch → sell → grow) |
| 10 — SEO | OG/Twitter image; outcome-first metadata; per-page metadata + canonical on home; FAQPage JSON-LD; guide links fixed (`/blog/guides/[slug]`) |
| 11 — Analytics | Marketing events now record in production through the canonical analytics store (no console-only) |
| 12 — Accessibility | Duplicate `id="faq"` removed; skip-link targets added to 5 subpages; `.btn-primary` contrast AA-safe |
| 13 — Performance | Root framer-motion template removed (no longer ships to the storefront or marketing pages) |

## Not changed (documented roadmap)

Pricing value-line copy per plan, feature-section regrouping (Build/Sell/Grow/
Scale), loading/skeleton for the DB-backed pricing query, and the canonical
Showcase page with live demo tenants.

See the companion docs: `marketing-copy`, `marketing-sections`,
`marketing-trust`, `marketing-pricing`, `marketing-performance`,
`marketing-seo`, `marketing-analytics`, `implementation-73-report`.
