# Runtime Diff

**IMPLEMENTATION-18 · 2026-08-01**

## Claim

Compare the runtime signatures and runtime output of local vs production for the
same creator.

## Runtime Signature

| | Local (current code) | Production (deployed code) |
|---|---|---|
| `data-runtime-signature` on `<main>` | `75e22f9c19ab334979b6…` | **absent** |
| Storefront RSC `resolvedData` | populated | `[]` |
| Builder canvas | renders live content | absent |

Production cannot emit a Runtime Signature because the deployed page predates
the signature wiring (IMPLEMENTATION-16). The absence of the signature marker is
itself proof that the deployed build ≠ the current code.

## Runtime output (browser truth)

- **Local** `/test-creator-1` renders: hero "Farah Live kz8r", "Test Creator 1's
  Products" (test ₹650, test product 2 ₹852), gallery, services, courses,
  timeline, games, links, testimonials, FAQ.
- **Production** `/test-creator-1` renders: placeholders only.

## Aggregate counts

| Runtime | hero | products | services | courses | gallery | timeline | games | links |
|---|---|---|---|---|---|---|---|---|
| Local trace | 1 | 2 | 2 | 2 | 3 | 3 | 2 | 3 |
| Production (server action) | throws `Invalid UUID ""` | — | — | — | — | — | — | — |

## Verdict

Local and production run **different code**. For identical database input, local
produces a populated runtime; production's aggregate throws before the runtime
can compose content. The runtime contract (LayoutEngine → ComponentRenderer →
DOM) is the same in principle; the divergent layer is the **aggregate** in the
deployed build.
