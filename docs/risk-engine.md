# Risk Engine — RCCF-EPIC-09

Deterministic risk detection from the signals bundle. Every finding carries a
severity; the overall risk is the highest severity.

## Findings

| Key | Severity | Condition |
| --- | --- | --- |
| trial_ending | high / critical | trial ends ≤ 3 days (critical at 0) |
| no_publish | high | website not published |
| no_products | high | no products |
| no_payment | medium | payment not configured (non-PLATFORM_COLLECT) |
| inactive | medium | no activity in 30 days |
| poor_health | medium | website health < 50 |
| low_profile | medium | knowledge/profile < 40 |
| no_recommendations | low | no next steps completed |
| stale_account | high | signed up > 14 days, no products/publish |

## Severity

`low` (no findings) → `medium` → `high` → `critical`.

## Surfaces

- **Creator dashboard** — "Needs attention" list on the Success Journey card.
- **Super Admin Customer Success Center** — "Creators at risk" (high/critical)
  and "Creators needing help" (medium) lists, sorted by score.
- **Agency dashboard** — "Clients needing attention" / "Could improve" for the
  agency's clients.

## Churn signal

`customer.churn-risk` is emitted when a creator's derived risk crosses into
high/critical.
