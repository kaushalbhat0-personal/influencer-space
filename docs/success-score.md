# Success Score — RCCF-EPIC-09

Nine weighted dimensions, 0–100. **Reuses existing runtime outputs** — no
duplicate Business Health or Knowledge calculations.

| Dimension | Weight | Source |
| --- | --- | --- |
| Activation | 10% | signup + import + generate + publish steps |
| Profile | 15% | Knowledge Runtime score |
| Website | 15% | Business Health score (or 60 if published) |
| Publishing | 15% | published ? 100 : 0 |
| Payment | 10% | payment readiness |
| Commerce | 15% | products + gallery + orders |
| Engagement | 10% | goal alignment + recommendations completed |
| Retention | 5% | recency of last activity / account age |
| Return | 5% | repeat orders (≥5 → 100) |

`overall = Σ(score × weight)` rounded.

## Buckets

- **High** ≥ 70 (top performers, retained)
- **Medium** 40–69
- **Low** < 40 (needs help)

## Verification

Unit-tested (`tests/unit/customer-success.test.ts`): a fresh creator scores
< 40, a grown creator > 70, all nine dimensions bounded 0–100.
