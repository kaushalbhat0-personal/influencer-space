# Marketing Trust — RCCF-IMPLEMENTATION-73

## What was removed (fabricated or empty)

- **About page "10,000+ Storefronts / 5,000+ Creators"** — unverifiable
  hardcoded numbers replaced with honest product facts: **100% revenue kept ·
  15-day free trial · 8 import platforms · <2 min setup** (`content.ts`).
- **"Join thousands of creators"** (About CTA) → honest copy.
- **Empty testimonials/metrics/case-studies** removed from the home page (they
  rendered nothing but carried "Trusted by creators like you" intent).
- **Placeholder WhatsApp number** (`+91-98765-43210`) — RESOLVED in
  RCCF-LAUNCH-POLISH-05: removed from the contact page. The only public contact
  is now `info.micronest@gmail.com` (see `docs/marketing-contact-polish.md`).
- **Legal identity inconsistency** ("Influencer Space" vs "CreatorStore") left
  in place — flagged; must be unified to one canonical legal name.
- **Unused fabricated testimonials** in `content.ts` (merch-sales-3x claims) —
  left in place but NOT wired; should be deleted.

## What replaced the trust layer

Product truth, which the platform can back:

- **Keep 100% of every sale** (no transaction fee) — hero bullet + FAQ.
- **15-day free trial, no credit card** — hero + pricing + FAQ.
- **Runtime-driven pricing** — every number derives from the Pricing Runtime.
- **Secure payments via Razorpay** — real (webhook exists).
- **Real storefront screenshot** in the hero (no fake mockup).

## Still to fix before launch

1. ~~Real WhatsApp/contact~~ — resolved: canonical email `info.micronest@gmail.com` (RCCF-LAUNCH-POLISH-05).
2. One canonical legal entity name across `/contact`, `/terms`, `/privacy`.
3. Delete the unused fabricated testimonials.
4. Either ship real early-user proof or keep the empty trust layer removed.
