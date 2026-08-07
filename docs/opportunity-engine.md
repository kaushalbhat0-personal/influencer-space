# Opportunity Engine — RCCF-EPIC-09

Deterministic opportunities detected from the signals bundle, scored by value.

| Type | Detected when | Value |
| --- | --- | --- |
| upgrade_growth | published + has products + on launch/free plan | 70 |
| upgrade_scale | order count ≥ 10 | 60 |
| agency | order count ≥ 20 + health ≥ 70 | 55 |
| addons | gallery ≥ 50 | 40 |
| high_selling_potential | products + health ≥ 70 + ≥2 recommendations | 50 |
| commerce_expansion | has products + no orders yet | 45 |
| seo_opportunity | published + no SEO configured | 35 |

Opportunities are surfaced on the creator dashboard (Success Journey card) and
drive the upgrade-through-value philosophy — never restriction.

`opportunity.detected` is emitted for newly-detected opportunity types between
check-ins.
