# Section Intelligence

RCCF-EPIC-08 · Phase 1, Phase 9.

`src/modules/experience-intelligence/domain/section-registry.ts`

One canonical registry of every section's intelligence. 15 sections each
declare:

- `priority` — base homepage position (lower = earlier)
- `conversionWeight` / `trustWeight` / `commerceWeight` / `seoWeight` (0–1)
- `healthContribution` — Business Health dimensions the section feeds
- `prerequisites` — sections that should appear first
- `preferredGoals` — goals that favour this section
- `preferredIndustries` — entity types the section suits
- `pagePlacement` — `home` or `home_or_page`
- `collapseRule` — `conditional` (hidden when content empty) or `always`
- `mobilePriority` — 1 = highest on mobile
- `collapseOnMobile` — whether the section collapses to a compact form
- `contentCheck(content)` — whether the section has meaningful content

| Section | Priority | Collapse | Mobile | Preferred goals |
| --- | --- | --- | --- | --- |
| hero | 0 | always | 1 | — |
| products | 20 | conditional | 3 | SELL_PRODUCTS, MONETIZE_CONTENT |
| pricing | 25 | conditional | 3 | GET_BOOKINGS, SELL_SERVICES |
| services | 30 | conditional | 4 | SELL_SERVICES, FIND_CLIENTS |
| courses | 30 | conditional | 4 | SELL_COURSES |
| gallery | 40 | conditional | 5 | SHOW_PORTFOLIO, FIND_CLIENTS |
| testimonials | 45 | conditional | 6 | INCREASE_TRUST, GET_BOOKINGS |
| timeline | 50 | conditional | 8 | INCREASE_TRUST, SHOW_PORTFOLIO |
| contentFeed | 55 | conditional | 7 | GROW_YOUTUBE, BUILD_COMMUNITY |
| faq | 60 | conditional | 9 | GET_BOOKINGS, SELL_COURSES |
| newsletter | 65 | always | 11 | BUILD_EMAIL_LIST |
| games | 70 | conditional | 10 | — |
| links | 75 | conditional | 10 | MONETIZE_CONTENT |
| contact | 80 | always | 12 | GENERATE_LEADS, FIND_CLIENTS |
| footer | 100 | always | 13 | — |

## Mobile experience (Phase 9)

Every section declares a `mobilePriority` and a `collapseOnMobile` flag. No
separate mobile layouts — the same sections stack/collapse deterministically.
The plan exposes `mobile: Array<{ base, mobilePriority, collapseOnMobile }>`,
consumed by the builder preview and available to the storefront's responsive
rendering.
