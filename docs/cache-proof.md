# Cache Proof

**IMPLEMENTATION-18 · Phase 8 · 2026-08-01**

## Claim

Verify cache behavior on production vs local and confirm stale caches are not
the divergence cause.

## Production storefront response headers

```
HTTP/1.1 200 OK
Age: 0
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Vary: RSC, Next-Router-State-Tree, Next-Router-Prefetch
X-Matched-Path: /[domain]
X-Vercel-Cache: MISS
```

- **No ISR / s-maxage** — the deployed page is **dynamic** (not the committed
  `revalidate = 60`; the deployed build differs from both the committed code and
  the current working tree).
- `Age: 0`, `X-Vercel-Cache: MISS` — the empty content is a **fresh render**, not
  a stale cache hit.

## Network truth (production)

- No `x-middleware-rewrite` on the storefront → the middleware did **not**
  rewrite `/test-creator-1` to a tenant host.
- `X-Matched-Path: /[domain]` → the correct route rendered.

## Conclusion

The storefront's empty content is **not** a cache artifact: the response is
uncached (`no-store`, `MISS`, `Age: 0`), freshly rendered, and the middleware
did not interfere. The divergence comes from the **aggregate** (see
`browser-vs-aggregate.md`), not from caching.

## Local comparison

Local (current working tree) storefront is `force-dynamic` (`no-store`) and
renders **content**; production (different build) is also `no-store` but renders
**empty** because the aggregate throws. Caching headers are equivalent; the
content difference is upstream.
