# Hero Copy Audit — RCCF-AUDIT-08

## Current hero

- **Headline:** "Turn your content into a **business**." (`Hero.tsx:15-20`)
- **Subhead:** "Paste your YouTube, Instagram, TikTok, or creator profile. Our
  AI builds your entire business — storefront, products, checkout, analytics,
  SEO, and a visual builder — ready in under two minutes." (`Hero.tsx:23-25`)
- **Primary CTA:** "Start" (`HeroInput.tsx:96`)
- **Secondary:** "Start as Creator without a URL →" · "Become a Partner"
- **Trust line:** "No credit card required" · "2-minute setup"

## 5-second test

| Question | Answer |
| --- | --- |
| What is it? | Clear — AI builds a creator business from a social profile |
| Who is it for? | Implicit (creators with a social profile); not explicit |
| Why different? | **Not stated in the hero** (no mention of UPI, 100% payouts, India focus) |
| Why trust it? | Thin — a fake browser mockup, not a real screenshot |
| What to do next? | Paste URL → "Start" |

## Issues

| Severity | Evidence | User impact | Fix | Complexity |
| --- | --- | --- | --- | --- |
| High | Primary CTA is just **"Start"** (`HeroInput.tsx:96`) — no value | Unclear what happens | "Build My Storefront" / "Get My Storefront Free" | Low |
| High | Hero preview is a **fake mockup** (`creatorstore.app/your-store`, `Hero.tsx:78`), real screenshots are broken | Weak trust at the money moment | Use real storefront screenshots | Low |
| High | **"You keep 100% of every sale" is absent** — the platform's strongest offer | Missed conversion driver | Add to subhead/trust line | Low |
| Medium | Subhead is a long dash-list run-on | Skimmability | Shorten to 2 sentences | Low |
| Medium | "Why different" missing (UPI, direct payouts, India) | No reason to switch | Add a differentiator line | Low |
| Medium | Trust line lacks logos/numbers | No social proof in viewport | Real metrics once available | Medium |
| Low | "ready in under two minutes" vs reality | Slight overpromise | "a guided, AI-powered build" | Low |

## Recommended hero concept (not implemented — audit only)

Headline: "Turn your content into a **business you own**."
Subhead: "Paste your YouTube, Instagram, or TikTok profile. CreatorStore builds
your storefront, products and checkout — and you keep **100% of every sale**."
Primary CTA: "Build My Storefront — Free".
