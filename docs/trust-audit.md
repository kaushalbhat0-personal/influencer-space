# Trust Audit — RCCF-AUDIT-08

## What reduces trust (ranked)

| Severity | Finding | Evidence | Fix | Complexity |
| --- | --- | --- | --- | --- |
| **Critical** | **Trust evidence is empty or fabricated**: testimonials/metrics/case-studies all render nothing (seeds intentionally emptied), yet the homepage shows "Trusted by creators like you" dead copy — AND the About page hardcodes "10,000+ Storefronts / 5,000+ Creators" (`about/page.tsx:44-60`) | `testimonials.ts:3-9`, `metrics.ts:3-11`, `case-studies.ts:3-9` empty; `content.ts:86-107` hardcoded stats | Remove fabricated stats; ship only real proof (real early users, real metrics) | Medium |
| High | **Contact WhatsApp "+91-98765-43210" is an obvious placeholder** | `contact/page.tsx:43` | ~~Real contact or remove~~ — RESOLVED in RCCF-LAUNCH-POLISH-05: removed; canonical contact is `info.micronest@gmail.com` | Low |
| High | **Legal entity naming inconsistent**: "CreatorStore India Pvt. Ltd." (`contact`) vs "operated by Influencer Space" (`terms`) vs "CreatorStore" | `contact/page.tsx:54`, `terms/page.tsx:14-15` | One canonical legal identity everywhere | Low |
| High | **Integration logos list Vercel + Next.js as partner "platforms"** | `logos.ts:3-14` under "Works with your existing platforms" | Remove own-stack logos (or relabel "Built on") | Low |
| Medium | **Agency revenue claim unbacked**: "Earn recurring commission" (pricing) vs agency billing "No rewards or commissions are active today" | `Pricing/data.ts:47` vs `agency/billing/page.tsx:107` | Align the story (surface the runtime or say "launching") | Medium |
| Medium | **Fabricated-feeling demo data**: "Found 182 videos" hardcoded (`AIDemo.tsx:16`); invented creators + "merch sales up 3x" in unused `content.ts:43` TESTIMONIALS | — | Real demo numbers or clearly interactive labels; delete the unused fabricated testimonials | Low |
| Medium | **No founder, no community, no social links** anywhere in marketing | grep | Add an "About the team" + social presence | Medium |
| Low | "Secure payments via Razorpay" trust item is real (webhook exists) — good; but `TrustBadges` component is dead | `TrustBadges.tsx` never rendered | Use it | Low |

## What builds trust (present)

- Honest Organization JSON-LD.
- Accurate, runtime-driven pricing + 15-day trial with "no credit card".
- Real terms/privacy/refund pages.
- Comparison table vs Linktree/Beacons/Stan (plausible, rendered).
- Razorpay-backed payments (real).

## Verdict

The biggest conversion risk on the whole site is the **empty/fabricated trust
layer** — the post-hero strip shows nothing, while the About page claims
unverified 10k/5k numbers. A prospect either sees no proof or sees numbers that
aren't real. This must be reconciled before launch.
