# Marketing Sections — RCCF-IMPLEMENTATION-73

## New sections

### SmartPlatform (`src/components/marketing/SmartPlatform.tsx`)
Six cards, each backed by a real runtime module but written for creators:
learn about your business · store readiness · know what to do next · match
your goals · personalized improvements · automatically optimized.

### CreatorJourney (`src/components/marketing/CreatorJourney.tsx`)
Mirrors the real onboarding pipeline (no invented flow): Paste your profile →
We understand your business → Your store is created → Make it yours → Launch →
Start selling → Grow.

## Home page section order (after alignment)

Hero → trust bar (integration logos) → BeforeAfter → HowItWorks → AIDemo →
PlatformOverview → **SmartPlatform** → **CreatorJourney** → BuilderShowcase →
SellAnything → Manage → CreatorShowcase → Agency → StorefrontShowcase →
ComparisonTable → Pricing → FinalCta → Footer.

## Removed (empty/fabricated trust)

- `TestimonialCarousel` (empty seed) — removed from the home page.
- `CaseStudyGrid` (empty seed) — removed.
- `MetricGrid` (empty seed) — removed from the trust bar.
- The duplicate `<PricingFAQ />` on home (the `Pricing` component already
  renders the FAQ) — fixes the duplicate `id="faq"`.

## Roadmap (documented)

- Regroup long feature lists into **Build / Sell / Grow / Scale** clusters.
- Per-plan pricing value lines ("why it matters").
- A canonical **Showcase** page with live demo tenants (the current
  `StorefrontShowcase` uses static screenshots).
