# Conversion Readiness

RCCF-EPIC-08 · Phase 8.

`src/modules/experience-intelligence/application/conversion-score.ts`

A derived, registry-driven score (0–100) estimating how ready the storefront is
to convert. No AI. It is a **separate** score from Business Health — it does
NOT change current Business Health calculations (feeds a future version).

## Dimensions

| Dimension | Weight | Source (Runtime Context) |
| --- | --- | --- |
| CTA | 20 | goal profile set + hero title |
| Trust | 15 | Trust Runtime profile |
| Commerce | 20 | products / orders / services / courses / bookings / affiliates |
| Content | 15 | gallery / FAQ / feed / timeline |
| Navigation | 10 | published + social links |
| Speed | 5 | published + live version + analytics |
| Contact | 5 | email / phone / location |
| SEO | 10 | knowledge SEO category |

`overall = round( Σ (dimension.score × weight) / Σ weight )`

## Trust Runtime (Phase 4)

`domain/trust-runtime.ts` — a canonical trust profile inside Experience
Intelligence. Sources:

| Source | Weight | Present when |
| --- | --- | --- |
| Testimonials | 30 | count > 0 |
| Achievements | 20 | declared fact |
| Milestones | 15 | count > 0 |
| Social presence | 10 | links > 0 |
| Community | 10 | declared hub or feed |
| Business Health | 10 | ≥ 70 |
| Completed recommendations | 5 | adoption ≥ 50 |

`trustScore = Σ(present source weight) / Σ(all source weight) × 100`.

## Not-a-duplicate guarantee

The conversion score reads existing runtime outputs from the shared Runtime
Context — it performs zero aggregate builds and zero score recomputation, and
it is intentionally independent of the Business Health score.
