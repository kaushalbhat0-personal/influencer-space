# Conversion Audit — RCCF-AUDIT-08

## CTA inventory

| Location | Label | href | Notes |
| --- | --- | --- | --- |
| Nav | Sign In | `/admin/login` | no `/login` route |
| Nav | Start as Creator | `/signup?persona=creator` | strongest CTA |
| Nav | Become a Partner | `/signup?persona=partner` | |
| Hero | **Start** | `/signup?url=…` | weak label |
| Hero | Start as Creator without a URL → | `/signup?persona=creator` | |
| Hero | Become a Partner | `/signup?persona=partner` | |
| AIDemo | Generate Your Storefront — Free | `/signup` | good |
| Builder | Try the Builder Free | `/signup` | "Free" = trial |
| SellAnything | Start selling — Free → | `/signup` | **no persona param** |
| Manage | Start building — Free → | `/signup` | **no persona param** |
| Agency | Start your partner journey — Free → | `/signup` | **no persona param** |
| CreatorShowcase | View storefront | `/signup` | **deceptive** — looks like a live store, routes to signup |
| Pricing | Start Free Trial / Upgrade | `/signup?plan=…` / `/signup` | |
| Pricing | Contact Sales | `/contact` | |
| FinalCta | Start as Creator / Become a Partner | `/signup?persona=…` | |

## Issues

| Severity | Finding | Fix | Complexity |
| --- | --- | --- | --- |
| High | **Too many "Start" variants** — decision fragmented across 5 different signup hrefs | Unify on `/signup?persona=…`; reduce per-section CTAs | Low |
| High | **"View storefront" routes to signup** (`CreatorShowcase.tsx:59-64`) — deceptive | Link to a real public storefront (a `/showcase` demo) or relabel | Low |
| High | **No CTA sells "get paid directly / 100% of every sale"** | Add a payments section + CTA | Medium |
| High | **No CTA sells agency passive income** (only a pricing bullet) | Agency section CTA → "See what you can earn" | Medium |
| Medium | SellAnything/Manage/Agency CTAs drop the persona param (inconsistent) | Add `?persona=` | Low |
| Medium | Primary hero CTA "Start" is weak | "Build My Storefront — Free" | Low |
| Medium | No **live demo storefront** anywhere; the only "preview" is a fake mockup + broken screenshots | Ship one real `/showcase` demo | Medium |
| Medium | Customer order portal (`/purchase`) never linked from marketing | Footer/nav link "Track your order" | Low |
| Medium | Trust bar renders nothing (empty testimonials/metrics/case-studies) — the post-hero strip has zero conversion support | Real proof or remove the strip | Medium |

## Funnel

Landing → Explore → Pricing → Signup → Onboarding → Publish → Subscription →
Retention. Friction points:
- Landing doesn't sell the strongest offers (100% payouts, guided journey).
- Pricing doesn't prove agency income.
- Trust evidence is absent/fabricated.
- No conversion event tracking to measure any of it (see `seo-audit` analytics).

## Dead conversion tooling

`StickyCTA` and `TrustBadges` components exist but are never rendered — built
and unused.
