# Browser vs Runtime

**IMPLEMENTATION-18 · Phase 1/6 · 2026-08-01**

## Claim

Compare what the **browser renders** against what the **runtime** produced
(RSC payload / server actions).

## Evidence — production `/test-creator-1`

The browser rendered the full page (200, `X-Matched-Path: /[domain]`, no
`x-middleware-rewrite`). The server's own output (RSC flight payload) is:

```
hero.default    props { title:"", subtitle:"", description:"" }
products.grid   props { resolvedData: [], resolvedTitle:"Products" }
gallery.grid    props { resolvedData: [] }
services.default props { resolvedData: [] }
courses.default props { resolvedData: [] }
testimonials.default props { resolvedData: [] }
faq.default     props { resolvedData: [] }
timeline.default props { resolvedData: [] }
games.default   props { resolvedData: [] }
links.default   props { resolvedData: [] }
footer.default  props { … }
```

The browser DOM (innerText) contains the corresponding **empty states**:
`Add products in Dashboard`, `Add images to your gallery`, `Add your services`,
…, `© — CreatorStore`.

## Match

**Browser DOM == Runtime output. The runtime itself produced an empty
aggregate.** The browser faithfully rendered what the runtime sent. The
divergence is **upstream of the runtime render**: the aggregate input to the
runtime was empty.

## Runtime trace check

Production does **not** render `data-runtime-signature` on `<main>` — the
deployed build predates IMPLEMENTATION-16's trace wiring. The runtime trace
cannot be compared from the browser on this deployment because the deployed code
does not emit it. This is itself evidence that the deployed build ≠ local.

## Verdict

- Browser == runtime (the runtime is honest).
- The broken layer is the **aggregate** (see `browser-vs-aggregate.md`), which
  the runtime consumes.
