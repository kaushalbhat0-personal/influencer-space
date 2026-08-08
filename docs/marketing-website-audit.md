# Marketing Website Audit — RCCF-AUDIT-08

Read-only audit from the perspective of a first-time creator, agency, customer,
search engine, investor and mobile visitor. Audited **against the platform's
actual capabilities** — every claim was verified against the runtime modules.

## Architecture

| Area | Status |
| --- | --- |
| Routes | All nav + footer links resolve; **broken guide links** (`/blog/guides/*` 404); **no `/login`** (nav → `/admin/login`); home + pricing are `force-dynamic` (runtime pricing) |
| Broken assets | **`StorefrontShowcase` images 404** — code points at `/marketing-assets/screenshots/storefront/…`, files live at `/marketing-assets/storefront/…` |
| Server vs client | Nav, Hero, AIDemo, Pricing, SectionTracker, template are client; home/pricing server; no `next/dynamic` code-splitting |
| SEO | Layout metadata + Organization schema honest; Pricing JSON-LD runtime-driven; **no OG/Twitter images**, home + contact have no per-page metadata |
| Analytics | Only Vercel Analytics/Speed Insights; **all marketing events are dev-only console logs**; **no signup/funnel conversion tracking** |
| Performance | `force-dynamic` DB pricing blocks LCP; no `loading.tsx`; root framer-motion `template.tsx` ships to the storefront; raw `<img>` only in marketing |

## Capability vs marketing claims (the core finding)

| Real capability (verified) | Marketing communicates it? |
| --- | --- |
| AI website generation from a profile | ✅ Prominent, accurate |
| Guided onboarding journey (real-time progress) | ❌ **Never mentioned** |
| Full visual builder | ✅ |
| Custom domains + SSL | ✅ |
| Products/services/courses/bookings | ✅ |
| **Creators keep 100% of product revenue / no transaction fee** | ❌ **Never on the marketing site** — the strongest creator offer is absent |
| Order fulfillment (shipping, secure downloads, customer portal) | ⚠️ "Track, fulfill, manage" only; the customer portal is never linked |
| **Agency recurring subscription revenue sharing** | ⚠️ **Overstated** — sold on pricing ("Earn recurring commission") while the agency billing page says "No rewards or commissions are active today" |
| Knowledge Runtime ("profile knowledge") | ❌ Never mentioned |
| Business Health ("store health") | ❌ Never mentioned |
| Customer Success ("success journey") | ❌ Never mentioned |
| Goals + recommendations | ❌ Never mentioned |
| Analytics + SEO tools | ✅ |
| Premium themes | ⚠️ Understated (one FAQ mention only) |
| Runtime pricing, annual toggle, 15-day trial | ✅ Accurate (₹699/₹1999/₹2999/₹7999; ~17% annual; trial) |

**Conclusion:** the marketing site sells the platform of several months ago. Five
differentiated, real capabilities (direct 100% payouts, the guided journey,
Knowledge/Business Health/Customer Success, goals/recommendations) are entirely
uncommunicated, while two claims are overstated relative to the codebase.

## Trust

- Testimonials, metrics, case studies all render **nothing** (seeds intentionally
  emptied) — the homepage's "Trusted by creators like you" heading is dead copy.
- **The About page hardcodes "10,000+ Storefronts / 5,000+ Creators"** —
  unverified numbers, contradicting the honesty policy that emptied the seeds.
- Contact WhatsApp "+91-98765-43210" is an obvious placeholder — **RESOLVED in
  RCCF-LAUNCH-POLISH-05** (canonical contact is now `info.micronest@gmail.com`).
- Legal entity naming inconsistent (CreatorStore vs "Influencer Space").
- `IntegrationLogos` lists Vercel/Next.js (the platform's own stack) as partner
  "platforms" — misleading.

## Broken / misleading

- Duplicate `id="faq"` on the homepage (two FAQ sections).
- `CreatorShowcase` "View storefront" CTA routes to **signup** (deceptive).
- `/faq` page contradicts the pricing runtime: wrong Scale price (₹1,995 vs
  ₹1,999) and claims "standard transaction fees" — the opposite of "never a
  transaction fee".
- `AgencyFeatures` (with the "Razorpay Route" revenue-splitting claim) is never
  rendered — dead code carrying a claim the platform doesn't use.

## Perspective verdicts

- **First-time creator:** understands "AI turns content into a business", but
  never hears "you keep 100% of every sale" and can't see the real-time guided
  journey.
- **Agency:** sees "earn recurring commission" but no proof; the "passive
  income" story is unbacked.
- **Customer:** no link to the order-tracking portal; no live demo storefront.
- **SEO:** reasonable metadata + honest JSON-LD, but no OG images and several
  public pages omitted from the sitemap.
- **Mobile:** good responsiveness; below-44px touch targets + weak focus ring.
- **Investor:** the trust data (stats/testimonials) is empty or fabricated.

See the companion docs for detail: `hero-copy-audit`, `pricing-audit`,
`conversion-audit`, `seo-audit`, `visual-audit`, `mobile-audit`, `trust-audit`,
`launch-readiness-marketing`, `implementation-roadmap-marketing`.
