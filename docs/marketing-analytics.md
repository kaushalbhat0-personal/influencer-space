# Marketing Analytics — RCCF-IMPLEMENTATION-73

## The problem (from AUDIT-08)

`trackMarketingEvent` only logged to the console in `development` — **zero
production analytics** from marketing, and the signup funnel events
(`ACTIVATION_FUNNEL`) were defined but never fired. Conversion was unmeasurable.

## Implemented

- `src/lib/analytics/events.ts` gains a canonical **in-memory analytics store**
  (`recordAnalyticsEvent` / `getAllAnalyticsEvents`, bounded to 500) alongside
  the funnel events.
- `src/lib/analytics/marketing.ts` `trackMarketingEvent` now **records in every
  environment** through that store — no console-only logging.

## Events wired (existing call sites now produce real data)

- `heroViewed`, `heroCtaClicked`, `heroInputFocused/UrlEntered/Submitted/PlatformDetected`
- `sectionViewed` (13 sections via SectionTracker)
- `aiDemoStarted/Completed/Skipped/Replay`
- `finalCtaClicked`

## Remaining (roadmap)

- Wire the **signup funnel** (`signup` → `workspace_created` →
  `website_generated` → `website_published` → `first_sale`) into
  `SignupForm`, `onboarding`, and publish paths.
- Persist events to the DB (`AnalyticsEvent`) or an external sink (GA4) so
  serverless instances share data.
- A marketing **Analytics Center** to visualize funnel drop-off
  (`getFunnelCounts`/`getFunnelDropoff` already exist).
- Scroll-depth + outbound-link tracking.
