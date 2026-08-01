# Browser vs Publish

**IMPLEMENTATION-18 · Phase 4 · 2026-08-01**

## Claim

Trace Publish → snapshot → database → storefront → browser, and explain why the
published storefront is empty.

## The published snapshot (database truth)

Latest live snapshot **v6** (created 2026-08-01T14:25:56Z):

```
content.products.length = 0
content.identity.name = ""
layout.sections = 12
```

This snapshot was written by the **newer publish pipeline** (impl-14+), which
persists **presentation only** — `content: EMPTY_AGGREGATE` — by design. Content
is expected to be merged **live** at render time.

## Storefront render path on production

```
getPublishedPageData → PublishSnapshot v6 (layout + EMPTY content)
mergeLiveContent(snapshot, tenantId):
    try: content = websiteAggregate.build(tenantId)
    catch: return snapshot          ← production lands here
```

- `websiteAggregate.build()` **throws** `Invalid UUID ""` (committed code).
- `mergeLiveContent` catches it and returns the snapshot unchanged.
- The snapshot's content is `EMPTY_AGGREGATE`.
- The browser renders the 12-section **layout** + **empty content** → placeholders.

## Evidence

- Production RSC payload: sections with `resolvedData: []`, hero `title: ""` —
  exactly `EMPTY_AGGREGATE` (the snapshot fallback).
- Production builder server action: `Invalid … uuid: ""` (the same throw).
- DB: snapshot v6 content is empty; DB content tables are populated.

## Verdict

Publish itself works and persists correctly (presentation-only). The empty
storefront is caused by the **live-content merge failing** (aggregate throws),
not by publish. The browser faithfully shows the snapshot fallback.

## Local comparison

With the current (working-tree) code, `websiteAggregate.build()` no longer
throws: the hero asset id is `null` and `resolveUrls`/`findById` reject `""`
(`asset-resolution-proof.md`). Local publishes → storefront renders live content.
