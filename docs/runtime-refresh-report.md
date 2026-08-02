# Runtime Refresh Report — IMPLEMENTATION-23

## Refresh pipeline

After a batch delete, `deleteAssetsBulk` calls `afterContentChange(tenantId)`
and the media page re-fetches via `load()`. Because the storefront is
`force-dynamic` and the aggregate is rebuilt on every request, deletions are
reflected without a manual refresh:

| Surface | Refresh mechanism |
|---|---|
| Media Library | client `load()` re-fetch after delete |
| Asset Details / Media Picker | re-query on open / re-render |
| Builder | loads the live aggregate fresh on navigation; deprecated/missing sections drop cleanly |
| Storefront Hero / Gallery | force-dynamic page rebuilds from the aggregate on next request |
| Publish snapshot | rebuilt from the (now consistent) builder pages |

## Verified (M7)

- After deletions, the storefront hero still renders with a non-zero bounding
  box and a valid runtime signature — deleted, unreferenced media never breaks
  the runtime.
- M1/M2/M5/M6 confirm the media library UI updates immediately after the batch
  delete (the deleted cards vanish, the notice reports the count, and storage
  objects removed).

## Reference protection never leaves dangling URLs

Because referenced assets are blocked from deletion (PART 3), the runtime can
never be left pointing at a deleted object — the Hero, Gallery, Products, etc.
always resolve to live assets.
