# RCCF-70.5.3 — Creator Hero Media Registration & Supabase Integrity Closure

## 1. Executive Verdict

**A — SAFE TO PROCEED (staged).**

The RCCF-70.5.1 Supabase `.info()` metadata fix is **already present and committed** in `src/lib/media/providers/supabase.ts` (`getObjectMetadata` reads top-level `data.size` / `data.contentType`, never `data.metadata.*`), shipped in commit `d09c593`, with regression tests already covering the exact production shape. This RCCF therefore contains **no provider code change** — Objective A is verified as already closed.

The **new, actionable defect** found in this audit is that the Hero Poster and Hero Background fields use `folder="hero"`, but the hero folder was video-only on both the client and the server. Any image upload to `folder="hero"` failed at the client pre-check ("Unsupported hero video format") and would also have been rejected server-side by `assertHeroVideoObject`. Poster/Background registration through the settings UI was therefore **impossible**, not just "untested."

This RCCF gates hero-video validation on the file being an actual video, on all six registration surfaces (prepare pre-check, signed completion, multipart upload, replace, move, and the client pre-check), so posters/backgrounds register as images while hero videos keep the full RCCF-59 contract. Verified with `tsc`, focused suites, the full 3148-test suite, ESLint, Prisma validate/generate, and `git diff --check`.

Not committed (per mission rule).

---

## 2. Production Root Cause

- **Reported symptom:** hero video uploads fail with `Supabase metadata failed: unknown`.
- **Root cause (RCCF-70.5 audit):** `SupabaseStorageProvider.getObjectMetadata` read `data.metadata.size` / `data.metadata.mimetype`, but Supabase's `/object/info` endpoint returns `size` / `contentType` at the **top level** with `metadata: {}`, so `metadata.size` was always `undefined` and the registration failed.
- **Status here:** the fix is already in the working tree and in `d09c593`. Verified by reading `supabase.ts:99-113` and `supabase.test.ts` (top-level shape tests, `metadata={}` valid, conflicting `metadata.size` ignored, missing size / provider-error / empty-error fail-closed cases).
- **Reconciliation:** the mission premise described the buggy code as current. It is not — the 70.5.1 fix shipped. **No provider change was made in this RCCF.** If production still shows the symptom, the deploy is running pre-`d09c593` code (verification below).

---

## 3. Provider Before/After

**Before (RCCF-70.5 regression, fixed in 70.5.1):**

```ts
const { data, error } = await this.client.storage.from(BUCKET).info(storageKey);
const size = data?.metadata?.size;          // always undefined
const mime = data?.metadata?.mimetype;      // always undefined
```

**After (current, verified — unchanged in this RCCF):** `supabase.ts:99-113`

```ts
const { data, error } = await this.client.storage.from(BUCKET).info(storageKey);
if (error || !data?.size) {
  throw new Error(`Supabase metadata failed: ${error?.message ?? "unknown"}`);
}
return { size: Number(data.size), mimeType: typeof data.contentType === "string" ? data.contentType : undefined };
```

- Maps `contentType` → `mimeType`, matching the provider contract `{ size: number; mimeType?: string }`.
- Fails closed when `size` is missing or the provider errors.
- `"Supabase metadata failed: unknown"` now only occurs when `.info()` itself fails without a message — it can no longer occur on a successful `.info()`.

---

## 4. Media Registration Pipeline

```
Client (uploadFileWithProgress)                    Server
─────────────────────────────────────────────────────────────────────────────
1. magic-bytes + hero pre-checks (UX)       →    2. POST /api/media/upload-url
                                                  mediaService.prepareSignedUpload
                                                    - validate mime/size (mediaValidator)
                                                    - dedupe by checksum
                                                    - quota pre-check (fast-fail)
                                                    - hero-video pre-check (gated: videos only)
                                                    - mint storageKey `${tenantId}/${folder}/${uuid}.${ext}`
                                                    - provider.createSignedUploadUrl
3. PUT file body DIRECTLY to signed URL     →    (bypasses Vercel 413; bytes never touch app server)
4. POST /api/media/register                 →    mediaService.completeSignedUpload
                                                  - assertOwnedStorageKey(tenantId, storageKey)
                                                  - provider.exists(storageKey)
                                                  - provider.getObjectMetadata → authoritative size
                                                  - mediaValidator against ACTUAL bytes
                                                  - dedupe by checksum (delete fresh orphan if diff key)
                                                  - quota gate
                                                  - hero validation (gated: videos only)
                                                  - provider.getPublicUrl → canonical URL
                                                  - commitAssetQuota (tenant row lock, atomic)
                                                  - Asset row READY → reference → event
```

**storageKey ownership is established at step 4**, in `assertOwnedStorageKey` (`service.ts:819`): server-session `tenantId` (route 401s when absent; never client-supplied) + the key must start with `${tenantId}/` and contain no `..`, `\`, or `\0`. Rejected **before any provider access**, so nothing foreign is ever read or deleted.

---

## 5. StorageKey Authorization

- **Server authority only:** `/api/media/register` takes `tenantId` from `getServerSession`; there is no client-supplied tenant ID in the body.
- **Prefix invariant:** storageKey must begin `${tenantId}/` — enforced by `assertOwnedStorageKey`.
- **Traversal/format guards:** rejects `..`, `\`, `\0`, empty keys.
- **Fail closed:** a foreign key throws `MediaValidationError` before `provider.exists` / `getObjectMetadata` / `delete` run (verified by tests asserting no provider call).
- **URL authority:** the persisted `publicUrl` is always `provider.getPublicUrl(storageKey)` (server-derived); the client-supplied `publicUrl` is ignored.
- **Config (`src/app/api/media/upload-url/route.ts`):** the key is minted server-side under the session tenant's prefix, so a client cannot steer the key into another tenant's namespace.

---

## 6. Hero Video

Preserved unchanged (RCCF-59 contract) — all gating in this RCCF keeps videos on the strict path:

- **Asset-backed only:** a raw client URL can never become hero-video authority. The settings write path (`assertHeroVideoWrite`, `settings.actions.ts:33`) requires a valid `videoAssetId` and calls `mediaService.assertHeroVideoAsset` (re-reads stored bytes).
- **Format:** MP4 / QuickTime only (`validateHeroVideo`).
- **Size:** ≤ 12 MB against the **authoritative stored bytes** (provider metadata), enforced at registration; pre-check is UX-only.
- **Duration:** ≤ 15 s parsed server-side from `moov/mvhd`; unparseable → **reject** (fail closed).
- **Read failure:** provider `readRange` failure → registration rejected, orphan cleaned up.
- **Quota:** hero bytes count against the plan's storage quota via `commitAssetQuota`.

---

## 7. Hero Poster

- **Path:** `MediaField(folder="hero", accept="image/*")` → signed upload → register → `posterAssetId` saved to hero config → resolved by `website-aggregate.service.ts:425-433` (`mediaService.resolveUrls`).
- **Fix applied:** hero-video validation now only runs for actual video payloads. Poster images register through the generic image validation (allowed image MIME list + ≤ 10 MB).
- **Server gating (`completeSignedUpload`):** `folder === "hero" && isVideoLike(providerMime, clientMime, filename)`. Any video signal (provider content-type, client mime, video extension) **fails closed toward hero-video validation** — a video masquerading as a poster is rejected, never registered as an image.
- **Prepared-upload pre-check:** `assertHeroVideoPrecheck` no longer rejects images on plans without the hero-video capability.
- **Client pre-check:** hero checks skipped for non-`video/*` files.
- **Tests:** poster registers (no `readRange`), provider-records-video fails closed, oversized hero image rejected by image limit.

---

## 8. Hero Background

- **Path:** `MediaField(folder="hero", accept="image/*")` → signed upload → register → `backgroundAssetId` → resolved at `website-aggregate.service.ts:436-439`.
- **Fix applied:** identical gating to the poster; background images register as images.
- **Tests:** background image (image/jpeg) registers without hero-video validation.

---

## 9. Quota / Asset Integrity

- **Authoritative size:** `provider.getObjectMetadata(...).size`; client-declared size is never used for quota or limits.
- **Atomic gate:** `commitAssetQuota` locks the tenant row, recomputes ACTIVE usage, and creates the Asset row in one transaction — no Asset row without quota headroom, no usage without a row.
- **Dedupe:** a duplicate checksum at the register step reuses the existing asset and (only when the fresh object references a different key) deletes the fresh orphan; never deletes a committed object.
- **No corrupt state on failure:** `assetCommitted` flag → a pre-commit failure deletes the freshly-PUT object (ownership proven) and leaves no Asset row; a post-commit failure keeps the object (it is referenced). No double-counting of storage.
- **Verified by tests:** metadata failure, quota failure, validation failure, reference-constraint failure after commit.

---

## 10. Orphan Handling

- **New failures:** cleaned up best-effort (`provider.delete`) only when tenant ownership of the key is proven by the prefix invariant. Cleanup never masks the original error.
- **Pre-existing orphaned hero objects (~21 objects / ~70 MB, tenant `flhllvzzbtkfrcrajicq`, bucket `influencer-images`):** **NOT touched.** No cleanup script was written. This is a separate ops item (decision required), out of scope per mission constraints.

---

## 11. Security Attack Matrix

| Attack | Vector | Result |
|---|---|---|
| Cross-tenant storageKey | Creator A registers Creator B's `storageKey` | **DENIED** before any provider access (`assertOwnedStorageKey`); no Asset, no quota, no delete |
| Tenant spoof | Client-supplied `tenantId` in body | **Impossible** — tenant comes only from server session |
| Traversal key | `t1/../t2/...` | **DENIED** (`..`/`\`/`\0` guard) |
| Raw URL authority | Client `publicUrl` in body | **Ignored** — canonical URL derived server-side |
| Provider metadata missing | `.info()` returns no usable size | **Fail closed** with meaningful error |
| Provider read failure | `readRange` throws | **Rejected**; orphan cleaned |
| Invalid hero video | Non-MP4 / >12 MB / >15 s | **Rejected** (RCCF-59, stored bytes) |
| Video masquerading as poster/background | video payload declared `image/*` | **Fail closed toward hero-video validation** (`isVideoLike`); rejected |
| Oversized hero image | >10 MB image in hero folder | **Rejected** by generic image limit |
| Failed registration | object PUT but no Asset row | Object deleted; no quota/Asset/hero reference |

---

## 12. Tests

**New in this RCCF** (`src/lib/media/__tests__/media-service.test.ts`, block "MediaService hero poster/background registration (RCCF-70.5.3)" — 9 tests):

1. Registers a hero poster image without hero-video validation (no `readRange`).
2. Registers a hero background image (image/jpeg) without hero-video validation.
3. Fails closed toward hero-video validation when the provider records a video content-type.
4. Rejects an oversized hero-folder image via the generic image limit.
5. Rejects a hero video when the provider read fails (fail closed + cleanup).
6. Does not apply the hero-video precheck to hero-folder images at the prepare step (plan without hero capability).
7. Uploads a hero-folder image via the multipart path without hero-video validation.
8. Allows moving an image into the hero folder.
9. Replaces a hero-folder poster image without hero-video validation.

**Pre-existing relevant coverage (verified passing):** Supabase `.info()` shape regression (`supabase.test.ts`), storageKey ownership / traversal / empty / foreign-key, server-derived canonical URL, RCCF-59 video rules (12 MB / 15 s / MP4 / capability), `assertHeroVideoAsset` (cross-tenant, deleted, oversized, format, read-failure), copy/move tenant scoping, quota wiring, orphan cleanup semantics.

---

## 13. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | Clean |
| Focused suites (`media-service`, `supabase`) | 58 / 58 |
| Full suite `npx vitest run` | **3148 / 3148** (209 files) |
| `npx eslint` on touched files | Clean |
| `git diff --check` | Clean |
| `npx prisma validate` | Schema valid |
| `npx prisma generate` | Regenerated (7.8.0) |

Note: one run of the full suite showed `tests/unit/rccf68-retry-catalog-timeout.test.ts` timing out at 5 s under full-suite load; it passes 11/11 in isolation and the re-run of the full suite passed 3148/3148. This is pre-existing suite-load flakiness in an onboarding/retry test untouched by this RCCF.

**Production DB behavior is NOT verifiable from this environment.** Whether production still exhibits `Supabase metadata failed: unknown` depends on the deployed commit; the fix is in `d09c593`. Confirm the deployed revision before treating the symptom as still open.

---

## 14. Exact Files Changed

1. `src/lib/media/service.ts` — gate hero-video validation on file type in `prepareSignedUpload` (pre-check), `completeSignedUpload` (with `isVideoLike` fail-closed classifier), multipart `upload`, `replace`, `move`; added private helpers `isVideoMime` / `isVideoLike`.
2. `src/lib/media/client-upload.ts` — hero pre-checks only run for `video/*` files.
3. `src/lib/media/__tests__/media-service.test.ts` — 9 new RCCF-70.5.3 tests.

No provider file changed (fix already shipped in 70.5.1).

---

## 15. Exact Files NOT Changed

- `src/lib/media/providers/supabase.ts` (fix already present), `local.ts`, `interface.ts`, `factory.ts`
- `src/app/api/media/register/route.ts`, `upload-url/route.ts`, `upload/route.ts`
- `src/lib/media/hero-validation.ts`, `hero-media.ts`, `validator.ts`, `resolve.ts`, `usage-resolver.ts`
- `src/features/settings/components/settings-form.tsx` (poster/background keep `folder="hero"`; gating makes images pass)
- `src/actions/settings.actions.ts` (hero-video asset-backed write path)
- Prisma schema / migrations, capabilityService, billing, storage.enforcement, plan-source
- Razorpay / checkout / ProductOrder, WhatsApp & affiliate commerce, bookings, service booking
- Builder state, publishing architecture, WebsiteAggregate, PublishedSnapshot, LayoutEngine, ComponentRegistry, Stitch, admin nav, auth/session, theme architecture

---

## 16. Remaining Findings

1. **Production deploy verification (P0):** confirm the live environment runs at least `d09c593`; if the symptom persists on a newer commit, the provider file on disk differs and must be re-checked.
2. **Orphaned hero objects (P2, ops):** ~21 objects / ~70 MB in `influencer-images` for tenant `flhllvzzbtkfrcrajicq` are still unreferenced. Delete only after a confirmed inventory + decision; no script shipped.
3. **Video-as-image masquerade boundary (P2, documented):** a video payload declared `image/*` is registered as an image if no provider/extension video signal exists. It can never become the hero **video** (hero write path re-validates via `assertHeroVideoAsset`), but it could render as a broken poster/background. Eliminating this requires content sniffing of stored bytes for images — a larger change outside this RCCF's scope (no second media architecture).
4. **RCCF-68 test flakiness (P3):** `tests/unit/rccf68-retry-catalog-timeout.test.ts` has a 5 s timeout that trips under full-suite load; passes in isolation.

---

## 17. Stitch Readiness

**Stitch-safe for hero media registration.** The three hero media paths (video / poster / background) now register correctly against Supabase, storageKey ownership and URL authority are server-enforced, RCCF-59 hero-video validation is preserved, and quota/asset integrity holds on failure. Ship `d09c593` (already pushed) + this change set; run the full regression suite in CI after deploy; treat orphan cleanup and the content-sniffing boundary as separate follow-ups.