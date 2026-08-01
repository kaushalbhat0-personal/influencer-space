# Runtime Signature Report

**IMPLEMENTATION-16 · Phase 16C · 2026-08-01**

## The signature

`computeRuntimeSignature()` in `src/lib/observability/runtime-trace.ts` produces
a content-addressed fingerprint of the rendered runtime:

```
Runtime Signature = SHA-256( canonical(theme) + canonical(layout) + SHA-256(canonical(aggregate)) )
```

- `canonical(x)` is a deterministic JSON serialization (object keys sorted) so
  the hash is independent of key insertion order — identical on server (Node)
  and client (browser).
- `SHA-256` is a pure, synchronous implementation used by **all** runtimes
  (no environment-dependent crypto), so the value is byte-for-byte identical
  everywhere.
- `theme` is the **resolved** theme (packageId + colors + typography).
- `layout` is the **flattened layout snapshot** (sections: moduleId, order,
  visible, config).
- `aggregate` is the live `WebsiteAggregate` content.

If two runtimes compute different signatures, they are not rendering the same
theme + layout + content — the runtime is not identical.

## Where it is computed

| Runtime | Code | Printed | Exposed in DOM |
|---|---|---|---|
| builder | `interactive-canvas.tsx` | ✅ trace + `data-runtime-signature` on canvas | ✅ |
| preview | `[domain]/page.tsx` | ✅ trace | ✅ (via main) |
| publish | `publishing/service.ts` | ✅ trace | — |
| storefront | `[domain]/page.tsx` | ✅ trace + `data-runtime-signature` on `<main>` | ✅ |
| production | `[domain]/page.tsx` | ✅ trace | ✅ |

## Evidence

### 1. Live traces (dev server, same creator)

| Runtime | Signature |
|---|---|
| builder | `a581407de4fd7b92c14d0788f7917a381d23bce5b3c95951337725260ab0f889` |
| storefront | `a581407de4fd7b92c14d0788f7917a381d23bce5b3c95951337725260ab0f889` |

Identical — Builder renders exactly what the Storefront renders.

### 2. Parity audit script (`npx tsx scripts/runtime-parity-audit.ts`)

```
— Builder (Draft) vs Storefront (Published) —
Draft signature:      a581407de4fd7b92c14d0788f7917a381d23bce5b3c95951337725260ab0f889
Published signature:  a581407de4fd7b92c14d0788f7917a381d23bce5b3c95951337725260ab0f889
Signatures match:     PASS
```

### 3. E2E parity test (production.spec.ts `04b`)

The test loads the storefront, reads `<main data-runtime-signature>`, then loads
the builder, reads the canvas `data-runtime-signature`, and asserts they are
equal. **PASS** in the production run (9/9).

## Semantics

- The signature changes when content changes (aggregate), when the layout
  changes (order/visibility/config), or when the theme changes. That is correct:
  the runtime genuinely changed.
- Builder and Storefront signatures are equal **whenever the draft layout equals
  the published layout** (i.e., no unpublished presentation edits). After Publish
  they always match; before Publish, a draft edit intentionally differs (the
  storefront still shows the last published layout).
- Production uses the identical pipeline, so in a production build the
  `production` runtime signature equals the `storefront` dev signature for the
  same published state.
