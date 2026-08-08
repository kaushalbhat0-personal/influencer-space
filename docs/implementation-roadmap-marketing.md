# Implementation Roadmap — Marketing — RCCF-AUDIT-08

Prioritized fixes before launch. Ordered by impact. Effort/risk/ROI estimated.

## Critical

| # | Fix | Effort | Risk | ROI |
| --- | --- | --- | --- | --- |
| C1 | **Fix `/faq` contradictions**: Scale price ₹1,995→₹1,999; remove "standard transaction fees" → state "0% transaction fees on every plan" (`content.ts:209`) | Low | Low | High |
| C2 | **Reconcile the trust layer**: remove About's fabricated "10,000+/5,000+" stats; ship only real proof; remove the dead "Trusted by creators like you" heading when empty | Medium | Low | High |
| C3 | **Sell "you keep 100% of every sale"** in the hero + a payments section (accurate vs `payments-client.tsx:86`) | Medium | Low | High |
| C4 | **Align the agency commission story** (pricing vs agency billing page) — surface the real runtime or clearly label "launching" | Medium | Medium | High |
| C5 | **Fix broken storefront screenshots** (`StorefrontShowcase.tsx:25,37` path) | Low | Low | High |
| C6 | **Fix the deceptive "View storefront" → signup** CTA | Low | Low | Medium |

## High

| # | Fix | Effort | Risk | ROI |
| --- | --- | --- | --- | --- |
| H1 | Wire **real conversion analytics** (GA4 or Vercel events): hero CTA, pricing CTA, signup funnel, scroll depth — currently dev-only console logs | Medium | Low | High |
| H2 | **Sell the guided journey + smart runtimes** (Knowledge, Business Health, Customer Success, goals, recommendations) — the five real, differentiated features | Medium | Low | High |
| H3 | Add **OG/Twitter images** + per-page metadata/canonical on home + contact | Low | Low | Medium |
| H4 | **Loading/skeleton + streaming** for the force-dynamic pricing on home/pricing (DB-blocked LCP) | Medium | Low | Medium |
| H5 | **Scope framer-motion off the storefront** + respect `prefers-reduced-motion` in JS animations | Medium | Low | Medium |
| H6 | Fix **skip-link targets** (`id="main-content"` on features/pricing/about/faq/showcase) + duplicate `id="faq"` | Low | Low | Medium |
| H7 | Strengthen **primary CTA copy** ("Build My Storefront — Free" not "Start") and **unify the 5 signup hrefs** (`?persona=`) | Low | Low | Medium |
| H8 | **Touch targets ≥44px** (nav, testimonial controls, pricing toggle) + mobile drawer focus trap/`aria-expanded` | Medium | Low | Medium |

## Medium

| # | Fix | Effort | Risk | ROI |
| --- | --- | --- | --- | --- |
| M1 | Add a **real `/showcase` live demo storefront** (and link the customer order portal) | Medium | Low | Medium |
| M2 | **AA contrast**: `.btn-primary` violet end-stop; `text-zinc-600` captions → `text-zinc-400` | Low | Low | Medium |
| M3 | Unify near-black surfaces + primary button on the design tokens | Low | Low | Low |
| M4 | Add the **concrete agency income example** (from the split runtime) to the Partner panel | Low | Low | Medium |
| M5 | Remove **own-stack logos (Vercel/Next.js)** from "Works with your platforms" | Low | Low | Low |
| M6 | Sitemap: add `/purchase`, `/claim-invite`, legal pages; robots: disallow `/onboarding`, `/purchase`, `/dev/` | Low | Low | Low |
| M7 | Remove the **fabricated demo data** ("182 videos", unused testimonials with "3x" claims) or make them clearly illustrative | Low | Low | Medium |
| M8 | ~~Contact: real WhatsApp/number~~ (done — canonical email `info.micronest@gmail.com`, RCCF-LAUNCH-POLISH-05); canonical legal entity name across pages | Low | Low | Low |

## Low

| # | Fix | Effort | Risk | ROI |
| --- | --- | --- | --- | --- |
| L1 | Fix `/blog/guides` 404 links | Low | Low | Low |
| L2 | `template.tsx` exit prop dead code | Low | Low | Low |
| L3 | Reuse `StickyCTA`/`TrustBadges`/`GlassCard` primitives (dead components) | Low | Low | Low |
| L4 | Add `FAQPage` JSON-LD to `/faq`; derive Pricing FAQ schema from the registry | Low | Low | Low |

## Sequence for launch

1. **C1–C6** (truth: fees, trust, 100%-payout, agency story, broken assets).
2. **H1–H3** (analytics, smart features, shareability).
3. **H4–H8** (performance, a11y, mobile, CTA unification).
4. **M/L** as time allows before go-live.
