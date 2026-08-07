# Knowledge Score

RCCF-EPIC-04 — Phase 1, Phase 2.

`src/modules/knowledge-runtime/application/score-engine.ts`

The Knowledge Score is a canonical, deterministic measure of how complete a
creator's business profile is. It returns:

- **Overall %** (0–100)
- **Per-category %** (0–100) for ten categories
- **Confidence** (0–1) in the assessment itself
- **Missing fields** (exactly what is unknown)

## Categories

| Category | Typical fields |
| --- | --- |
| Identity | Display name |
| Brand | Tagline, bio, logo, brand colors, mission, voice |
| Media | Profile photo, banner, hero media, hero title |
| Commerce | Products, pricing, services, courses, bookings, product quality |
| Content | Gallery/portfolio, gallery quality, FAQ, content feed |
| Trust | Testimonials, milestones/timeline, achievements |
| Social | Social links, primary platform, connected feed, affiliate links |
| SEO | Title, description, keywords |
| Contact | Email, phone, location, languages |
| Business | Custom domain, business hours |

## Weighting

Every field declares a `priority` (1–5). Priority weight is
`weight = 6 - priority` (priority 1 → 5, priority 5 → 1).

- **Per-category %** = `100 × Σ(weight of complete fields) / Σ(weight of all applicable fields in category)`.
- **Overall %** = the same formula applied across all applicable fields, not an
  average of category percentages (so larger categories weigh more naturally).

A field is *applicable* when it is universal, or belongs to the profile's
category pack and is not replaced by a pack field.

## Confidence

Confidence reflects how much of the assessment rests on **verified sources**:

| Source | Confidence contribution |
| --- | --- |
| `aggregate` | 0.95 (canonical WebsiteAggregate) |
| `table` | 0.95 (DB tables: products, gallery, etc.) |
| `setting` | 0.85 (JSON settings) |
| `declared` | 0.6 (creator-confirmed facts) |

`confidence = average of source-confidence over complete fields`
(0.5 when nothing is complete yet). AI-invented values never contribute — the
runtime cannot invent anything, so confidence is never overstated.

## Missing-field detection

`application/analyzer.ts` — a field is **missing** only when its registry
`complete(snapshot)` predicate fails. Fields the profile already has are never
re-asked ("do not ask for data already known").

Ordering is meaningful: required before optional, then priority, then registry
order (business priority, never alphabetical).

## Illustration

A typical sparse profile (name + hero title only) scores roughly:

```
Overall     58%
Brand       90%
Commerce    20%
Trust       45%
Media       70%
SEO         10%
```

Individual numbers depend on the profile; the principle is fixed: the score is
**registry-derived**, deterministic, and cheap to compute on every dashboard
load. No AI call is involved.

## Labels

- `scoreLabel(percent)`: `poor` (<40) · `developing` (40–59) · `solid` (60–79) · `premium` (≥80).
- `confidenceLabel(confidence)`: `low` · `medium` · `high`.

## Verifying

Unit tests: `tests/unit/knowledge-runtime.test.ts` — "Phase 1" and "Phase 2"
describe cover scoring, category percentages, missing-field detection, and the
"never ask for known data" guarantee.
