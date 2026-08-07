# Marketing Polish — RCCF-LAUNCH-TRACK-01

## 5-second comprehension (verified)

First viewport = fixed nav (with "Start as Creator" CTA) + headline
**"Turn your content into a business."** + subhead ("paste your social profile —
our AI builds your storefront, products, checkout, analytics, SEO, and a visual
builder in under two minutes") + a paste-your-URL input with a **Start** CTA +
"No credit card required / 2-minute setup" trust line.

- What it does ✅ (AI builds a creator business from a social profile)
- Who it's for ✅ (creators with a social presence)
- Why it's different ✅ (under 2 minutes, no credit card)
- How to start ✅ (paste URL → Start)

## Hero

| Item | Verdict |
| --- | --- |
| Headline | Strong; action-oriented |
| Subhead | Clear, specific, benefit-led |
| Primary CTA | URL input + "Start" — contextual, good |
| Trust line | "No credit card required · 2-minute setup" — present |
| Preview column | Hidden on mobile (`hidden lg:block`) — mobile first-viewport is copy-only; acceptable, roadmap: add a compact visual |

## Pricing (runtime-driven — IMPLEMENTATION-70/71)

- Premium cards with Most Popular (Growth), Best Value (Scale), Recommended
  (Solo), annual toggle with savings, 15-day trial framing, enterprise separated
  under Enterprise Solutions, comparison matrix auto-derived from the runtime.
- Upgrade confidence: `getUpgrade(code)` shows exactly what the next tier adds.

## FAQ / trust

- 15-day-trial FAQ added; agency value panel (recurring commission, client
  management, multi-website) reinforces the partner story.
- Trust indicators, testimonials and case studies verified present.

## Conversion flow

Visitor → paste URL → signup → import → knowledge → goals → build → publish.
No dead ends found; every step is one action. See `docs/launch-checklist.md`.

## Gaps (roadmap)

- Mobile hero visual (a compact product shot/gif under the input).
- Marketing button system aligned to the unified `Button` primitive (DS-1).
- Copy: "generate" → "build" already applied across onboarding; continue the
  pass on remaining marketing copy.
