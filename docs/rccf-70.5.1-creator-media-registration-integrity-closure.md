# RCCF-70.5.1 — Creator Media Registration Integrity Closure Report

Status: **COMPLETE** (implementation landed, verification green)

## 1. Executive Verdict

The confirmed root cause of "Supabase metadata failed: unknown" was a provider
mapping bug: `getObjectMetadata()` read `data.metadata.size` /
`data.metadata.mimetype`, but Supabase's `/object/info/` endpoint returns
`size` / `contentType` at the **top level** and `metadata` as an empty object
`{}`. Every signed upload therefore failed at registration after the bytes had
already been stored, leaving an orphan object and no Asset row.

The fix is a narrow, provider-only mapping correction. It is supplemented by
three hardenings at the registration boundary that were surfaced by the audit:

1. **storageKey tenant ownership** — the client-supplied storageKey must begin
   with `${tenantId}/` (server-session tenantId), rejecting foreign/malformed/
   traversal/empty keys before any provider access.
2. **Server-derived public URL** — the stored `publicUrl` is now always
   `provider.getPublicUrl(storageKey)`; the client-supplied value is never
   authoritative.
3. **Fail-closed orphan cleanup** — post-upload registration failures safely
   delete the freshly uploaded object (ownership already established) without
   masking the original error; an object is never deleted once its Asset row is
   committed.

No storage architecture change, no schema change, zero migrations. Production
data untouched.

## 2. Root Cause Fixed

`src/lib/media/providers/supabase.ts` — `getObjectMetadata()`:

```ts
// BEFORE (broken): read a field that Supabase never returns on .info()
if (error || !data?.metadata?.size) {
  throw new Error(`Supabase metadata failed: ${error?.message ?? "unknown"}`);
}
return {
  size: Number(data.metadata.size),
  mimeType: typeof data.metadata.mimetype === "string" ? data.metadata.mimetype : undefined,
};

// AFTER (RCCF-70.5.1): consume the real /object/info/ shape
if (error || !data?.size) {
  throw new Error(`Supabase metadata failed: ${error?.message ?? "unknown"}`);
}
return {
  size: Number(data.size),
  mimeType: typeof data.contentType === "string" ? data.contentType : undefined,
};
```

On a successful `.info()` response `error === null` and `data.metadata.size`
was `undefined`, so the guard always threw with `error?.message ?? "unknown"`
→ `"unknown"`. That is now impossible: a successful response carries top-level
`size`, the guard passes, and registration proceeds. A genuine provider error
still fails closed with its message (or `"unknown"` when the error object has no
message, matching the existing convention).

## 3. Supabase Metadata Before/After

| Input (real `.info()` payload) | Before | After |
| --- | --- | --- |
| `{ size: 11779741, contentType: "video/mp4", metadata: {} }` | throws `Supabase metadata failed: unknown` | `{ size: 11779741, mimeType: "video/mp4" }` |
| `{ size: 1234, metadata: {} }` | throws `unknown` | `{ size: 1234, mimeType: undefined }` |
| `{ error: { message: "Object not found" }, data: null }` | throws (same) | throws `...: Object not found` |
| `{ size: 0 }` / no `size` | throws | throws (fail closed, same) |

The provider abstraction, `StorageProvider` interface, and other providers
(local, factory) are unchanged.

## 4. Signed Upload End-to-End Flow

```
client PUT to signed URL         → object physically stored (unchanged)
POST /api/media/register         → completeSignedUpload()
  1. assertOwnedStorageKey()     → tenant ownership invariant        [NEW]
  2. provider.exists()           → object landed (unchanged)
  3. provider.getObjectMetadata()→ top-level size (FIXED; was always throwing)
  4. validateUpload(actualSize)  → per-category limits (unchanged)
  5. findDuplicates()            → dedupe (unchanged; orphan cleanup NEW)
  6. assertStorageQuota(actual)  → fast-fail quota (unchanged)
  7. assertHeroVideoObject()     → RCCF-59 hero stored-byte validation (unchanged)
  8. provider.getPublicUrl(key)  → canonical URL (NEW, replaces client publicUrl)
  9. commitAssetQuota(create)    → atomic Asset row (unchanged)
 10. READY + reference + emit    → returns canonical URL
  → on any failure at 3..9: safe delete of the orphan (NEW, assetCommitted-guarded)
```

The actual upload and Asset registration now succeed — the fix makes the
existing validation reachable rather than replacing it.

## 5. StorageKey Tenant Ownership

`assertOwnedStorageKey(tenantId, storageKey)` runs as the **first** step of
`completeSignedUpload`, before `exists()` and before any provider access:

- `tenantId` comes exclusively from the server-side session authority (the
  register route derives it from `getServerSession`), never from the client.
- Rejects:
  - empty / non-string `storageKey` → `Invalid storage key`
  - `storageKey` not starting with `${tenantId}/` → `Storage key does not belong to the current tenant` (covers foreign-tenant keys AND keys missing the prefix, e.g. `hero/h.mp4`)
  - traversal / malformed values (`..`, backslash, null byte) → `Malformed storage key` (covers `t1/../t2/hero/h.mp4`, etc.)
- Because it rejects before provider access, a foreign key can never be read or
  deleted — the cleanup path only ever runs on keys proven to be this tenant's.
- Fail closed: no key that cannot belong to the authenticated tenant proceeds.

## 6. Public URL Authority

`register/route.ts` continues to accept `publicUrl` from the client (API
contract preserved for the existing `client-upload.ts` flow), but the stored
value is now always:

```
registeredAsset.publicUrl === await provider.getPublicUrl(storageKey)
```

`completeSignedUpload` derives the canonical URL server-side via the existing
provider abstraction, stores it on the Asset row, and returns it to the client.
A missing/empty canonical URL fails closed (`Could not derive a public URL...`).
No new URL builder was introduced; the provider abstraction is unchanged.

## 7. Failure / Orphan Handling

- **Ownership-rejected path** (foreign/malformed key): throws with **no**
  deletion — ownership was never established.
- **Post-upload failure path** (metadata failure, size unverifiable, validation
  failure, quota rejection, hero rejection, canonical-URL failure): the freshly
  uploaded object is deleted best-effort via `provider.delete(storageKey)`.
- **Dedupe path**: when a duplicate asset exists, the freshly PUT object is an
  orphan and is deleted — **unless** the existing asset references this exact
  key (a re-registration of a committed object), in which case it is preserved.
- **Asset committed**: once `commitAssetQuota` returns, the row references the
  object, so a later failure (READY update / reference creation) does **not**
  delete it (`assetCommitted` guard).
- Cleanup failures never mask the original error (original is re-thrown) and
  log a sanitized diagnostic via the shared logger (tenantId + storageKey only —
  no credentials/storage internals).
- Existing production orphans are **not** touched (see §13).

## 8. RCCF-59 Validation Preservation

The authoritative server-side hero contract is fully intact and now reachable:

- `assertHeroVideoObject` runs for `folder === "hero"` inside
  `completeSignedUpload` (stored-byte validation: tenant-owned key, MP4/
  QuickTime restriction, 12 MB max, 15 s max via `provider.readRange`, fail
  closed when the provider cannot read).
- `assertHeroVideoPrecheck` at signed-URL issuance (UX fast-fail) unchanged.
- `assertHeroVideoAsset` for the hero write path / move-to-hero unchanged.
- The metadata fix unblocks the flow so these validators execute — it does not
  bypass any of them.

## 9. Tests Added

### `src/lib/media/providers/__tests__/supabase.test.ts` (NEW — provider regression)

Guards the exact `.info()` shape so the original regression cannot return:

1. top-level `size`/`contentType` maps to `{ size, mimeType }` (fixture
   `{ size: 11779741, contentType: "video/mp4", metadata: {} }`)
2. `metadata={}` is valid; `metadata.size` is never consulted
3. conflicting `metadata.size` is ignored; top-level wins
4. conflicting `metadata.mimetype` is ignored; `contentType` wins
5. `contentType` missing → size succeeds, `mimeType: undefined`
6. size missing → reject
7. provider error → reject with message
8. provider error with no message → reject with `"unknown"`

### `src/lib/media/__tests__/media-service.test.ts` (extended — registration security)

Covers all 13 requested registration cases:

1. own-tenant storageKey allowed
2. foreign-tenant storageKey rejected (no provider access, no delete)
3. storageKey without tenant prefix rejected
4. empty storageKey rejected
5. traversal storageKey rejected
6. client publicUrl differs → stored canonical URL
7. top-level metadata size → Asset creation succeeds
8. metadata failure → no Asset row + orphan cleanup
9. success → Asset row has provider-reported size + mimeType
10. hero signed upload reaches RCCF-59 stored-byte validation
11. invalid hero video (20 s) still rejected + cleanup
12. validation failure consumes no quota (`enforceStorageLimit` not called)
13. failed registration creates no duplicate Asset rows
    plus: committed-asset later-step failure does **not** delete the object

## 10. Regression Results

| Check | Result |
| --- | --- |
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` (full) | 3130 passed, 1 failed — `rccf68-retry-catalog-timeout` (5 s flaky timeout under full-suite load; passes in isolation, unrelated to media) |
| `npm run build` | success |
| `npx prisma validate` | schema valid |
| `npx prisma generate` | success |
| `npx eslint <touched files>` | clean |
| `git diff --check` | clean |
| Focused regression suites (RCCF-59 storage/hero, RCCF-67 service booking + storefront/commerce integrity, RCCF-66 WhatsApp, RCCF-65 affiliate, RCCF-69 commerce integrity, media-service, hero-unification) | 177 passed (12 files) |

The single full-suite failure (`rccf68-retry-catalog-timeout.test.ts`) is a
pre-existing timing flake (onboarding retry idempotency; `Test timed out in
5000ms` under parallel load) unrelated to the media changes; it passes in
isolation and was not introduced here.

## 11. Exact Files Changed

- `src/lib/media/providers/supabase.ts` — `getObjectMetadata()` reads top-level
  `data.size` / `data.contentType` (root-cause fix).
- `src/lib/media/service.ts` — new `assertOwnedStorageKey()` guard; hardened
  `completeSignedUpload()` (ownership check first, server-derived canonical URL,
  assetCommitted-guarded orphan cleanup, dedupe orphan cleanup, logger import).
- `src/lib/media/__tests__/media-service.test.ts` — added RCCF-70.5.1
  registration-security block; `getPublicUrl` default mock in `beforeEach`.
- `src/lib/media/providers/__tests__/supabase.test.ts` — NEW provider regression
  test for the `.info()` shape.

## 12. Exact Files Not Changed

- `src/app/api/media/register/route.ts` — API contract preserved; `publicUrl`
  still accepted but no longer authoritative (service derives it server-side).
- `src/lib/media/providers/interface.ts` — provider abstraction unchanged.
- `src/lib/media/providers/local.ts`, `providers/factory.ts` — unchanged.
- `src/lib/media/client-upload.ts` — unchanged (still sends `publicUrl`; server ignores it as authority).
- `src/lib/media/hero-validation.ts`, `validator.ts`, `repositories/*`,
  `processing/*`, `usage-resolver.ts` — unchanged.
- `prisma/schema.prisma`, `prisma/migrations/*` — unchanged. **Zero migrations.**
- Settings preview / hero UI / storefront / aggregate / LayoutEngine /
  HeroRenderer / Stitch — untouched (frozen per RCCF-70.5.1).

## 13. Production Data Impact

- **Existing orphan storage objects were NOT deleted.** No reconciliation or
  bulk deletion was performed. 62 storage objects / 23 hero objects / 21 hero
  orphans (~70 MB) remain exactly as the audit found them.
- **Existing production Assets were NOT modified.**
- **No migration was introduced.**
- Only behavior for NEW failed uploads changes: they now clean up the orphan
  instead of silently leaking it (and, for successful uploads, registration now
  actually completes).

## 14. Remaining RCCF-70.5 Findings

Carried forward unchanged (not addressed here, per scope):

- **Hero preview/live parity** — `SettingsLivePreview` is a self-contained mock
  (no CTAs, social links, subtitle, background; manual Video/Poster toggle;
  plain `object-*` alignment vs live `@container/main` variants; bypasses the
  aggregate/resolver).
- **Background image lifecycle** — `backgroundUrl/backgroundAssetId` exists in
  the HeroDataType but is unset in production data and unresolved by the
  aggregate; removal requires a separate lifecycle decision.
- **Dead `HeroBanner`** — `src/app/[domain]/_components/hero-banner.tsx` has no
  imports; deletion is a cleanup boundary.
- **Provider integration coverage** — the new provider regression test covers
  the `.info()` mapping; broader live-provider integration coverage (against a
  real Supabase bucket) remains a follow-up if desired.

## 15. Recommended RCCF-70.5.2

**Hero Preview/Live Parity.** Bring `SettingsLivePreview` to parity with the
live Hero renderer (CTAs, social links, subtitle, background, responsive
`@container/main` alignment) by driving it from the same aggregate/resolver
data path used by `[domain]` — and decide the background-image lifecycle before
removing Hero Background Image.