# Pricing Audit — RCCF-AUDIT-08

## Verified accurate (vs the runtime)

| Item | Status |
| --- | --- |
| Prices | Growth ₹699, Scale ₹1,999, Solo ₹2,999, Partner Scale ₹7,999 — all match `src/config/commerce/plans.ts` ✅ |
| Annual savings | "Save ~17%" is mathematically correct (~16.7%) ✅ |
| 15-day trial | Card framing + trust item + pricing FAQ all correct ✅ |
| Creator Enterprise separation | Rendered separately as "Custom pricing / Contact Sales", excluded from comparison ✅ |
| Comparison matrix | Runtime-driven from `FEATURE_CATALOG` + plan features — accurate by construction ✅ |
| Partner minimum | "Creator Growth minimum for partner-onboarded creators" — accurate (`MIN_PLAN_FOR_AGENCY_CREATORS`) ✅ |

## Issues

| Severity | Evidence | User impact | Fix | Complexity |
| --- | --- | --- | --- | --- |
| **Critical** | **`/faq` page contradicts pricing**: Scale shown as ₹1,995 (`content.ts:209`) and claims "standard transaction fees" on free, "reduced fees" on paid — the opposite of "CreatorStore never takes a transaction fee" | Undermines the core value prop; a prospect reads a lie | Fix `content.ts` to runtime values; state "0% transaction fees on every plan" | Low |
| High | "Earn recurring commission" is sold on the pricing Partner tab (`Pricing/data.ts:47`) while `agency/billing/page.tsx:107` says "No rewards or commissions are active today" | Overstated claim; trust risk with agencies | Align: either surface the runtime (it exists) or soften to "Launching soon" | Medium |
| Medium | Partner tab value panel is a bullet list; no **passive-income proof** (no example: "a client on Growth = your share ₹X/mo") | Weak agency conversion | Add a concrete worked example derived from the split runtime | Low |
| Medium | Trial messaging is clear on the Pricing component but the `/faq` page still says "The Creator Launch plan is free…" with no expiry | Conflicting trial story | Align the FAQ page with the 15-day trial | Low |
| Low | "Start Free Trial" (Launch) vs "Upgrade to Growth" — consistent; no issues | — | — | — |
| Low | Comparison table is wide (12 groups) — fine on desktop, `overflow-x-auto` on mobile | Acceptable | Consider collapsing minor rows on mobile | Low |

## Value communication

The pricing page communicates **what each plan includes** but rarely **why it
matters**. "Everything in Growth + API access" doesn't sell. The runtime's own
upgrade copy (`getUpgrade`) is more compelling — the page could surface it.

## Recommendation (audit only)

- Fix the `/faq` fee/price contradictions (Critical).
- Add the concrete agency revenue example.
- State the 0%-fee guarantee prominently near pricing.
