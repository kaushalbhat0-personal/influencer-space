# RCCF-70.5 — Creator Hero Media Truth & Preview Parity Audit Report

**Scope:** Read-only forensic audit. No application code, schema, migration,
database, Stitch file, or UI was modified. Every claim below was verified
against the live production Supabase project (`flhllvzzbtkfrcrajicq`), the
production Postgres (pooled `DATABASE_URL`), and the installed
`@supabase/storage-js@2.110.2` source.

**Date:** 2026-08-16

---

## 1. Executive Summary

**One defect is the root cause of the "Supabase metadata failed: unknown" error
on Hero Video AND Hero Poster uploads** (and every other signed upload):

> `src/lib/media/providers/supabase.ts:99-108` — `getObjectMetadata()` reads
> `data.metadata.size`, but Supabase's `/object/info/` endpoint
> (`FileObjectV2`) returns `size` at the **top level** (`data.size`) and
> `metadata` as an **empty object** `{}`. The guard `!data?.metadata?.size` is
> therefore ALWAYS true for a successful response, so the method ALWAYS throws
> `Supabase metadata failed: unknown`.

"unknown" is not an unknown error. It is the `error?.message ?? "unknown"`
fallback firing on a **successful** `.info()` response — because `error` is
`null` and the code then reads the wrong field, `data.metadata.size`.

The upload sequence is: PUT to signed URL succeeds (object IS in storage) →
`POST /api/media/register` → `completeSignedUpload` → `exists()` passes →
`getObjectMetadata()` throws → **Asset row is never created**. Every failed
attempt also **leaves an orphan object in storage**.

The defect is a **regression introduced by commit `9b98612`
(2026-08-12, "feat(platform): restore creator website experience")**, which
added the `getObjectMetadata` verification to `completeSignedUpload`. Assets
registered before that commit (e.g. tenant `c56955c9` on 2026-08-03) work;
everything after it fails.

**Smallest safe fix (report only):** in `getObjectMetadata`, read `data.size`
and `data.contentType` instead of `data.metadata.size` /
`data.metadata.mimetype`. No other code change is required.

---

## 2. Root Cause — "Supabase metadata failed: unknown"

### 2.1 The defect

```ts
// src/lib/media/providers/supabase.ts
async getObjectMetadata(storageKey) {
  const { data, error } = await this.client.storage.from(BUCKET).info(storageKey);
  if (error || !data?.metadata?.size) {          // <-- BUG: metadata is {}
    throw new Error(`Supabase metadata failed: ${error?.message ?? "unknown"}`);
  }
  return {
    size: Number(data.metadata.size),            // <-- BUG
    mimeType: data.metadata.mimetype,            // <-- BUG (unreachable)
  };
}
```

### 2.2 What `.info()` actually returns (verified against production)

Probe against a real hero object (service role key, storage-js 2.110.2):

```json
{
  "id": "be1029f5-519c-401a-acef-7a18620a54d0",
  "name": "05b431c0-.../hero/1784842857621-zkpbh.mp4",
  "version": "447afaae-...",
  "bucketId": "influencer-images",
  "size": 11779741,          // <-- size is TOP LEVEL
  "contentType": "video/mp4",// <-- contentType is TOP LEVEL
  "cacheControl": "max-age=3600",
  "etag": "...",
  "metadata": {},            // <-- metadata is EMPTY {}
  "lastModified": "...",
  "createdAt": "..."
}
```

`HAS_METADATA_SIZE=false`, `METADATA_KEYS=[]`. The storage-js type confirms:
`FileObjectV2 { size?: number; content_type?: string; metadata?: FileMetadata }`
— `size`/`contentType` are top-level; `metadata` holds only user-set custom
metadata (always `{}` here because uploads never pass a `metadata` option).

### 2.3 Why the message is "unknown"

`.info()` succeeded → `error === null`. The guard then evaluates
`!data.metadata.size` → `!undefined` → `true` → throw with
`error?.message ?? "unknown"` → `null ?? "unknown"` → **"unknown"**.

A StorageApiError (e.g. 404 "Object not found") would carry a real message and
would surface as `Supabase metadata failed: <message>` — so "unknown"
specifically identifies the **successful-response shape mismatch**, not a 404.

### 2.4 Call chain that produces the error

```
MediaField.uploadFile()
  → uploadFileWithProgress()            src/lib/media/client-upload.ts:53
  → POST /api/media/upload-url          src/app/api/media/upload-url/route.ts
  → prepareSignedUpload()               src/lib/media/service.ts:140
  → provider.createSignedUploadUrl()    src/lib/media/providers/supabase.ts:17
  → client PUT body to signed URL       client-upload.ts:103   (object LANDS in storage)
  → POST /api/media/register            src/app/api/media/register/route.ts
  → mediaService.completeSignedUpload() src/lib/media/service.ts:205
  → provider.exists()                   list+search → TRUE (object exists)
  → provider.getObjectMetadata()        .info() → metadata={} → THROWS "unknown"
  → register route returns 400 fail("Supabase metadata failed: unknown")
  → MediaField.fail() shows the message; onChange NOT fired; Asset row absent
```

Because `exists()` passes before `getObjectMetadata` is reached, the object is
definitely in storage when the error fires — the failure is the metadata read,
NOT a missing upload.

### 2.5 Regression window

- Commit `9b98612` (2026-08-12) added lines 230-240 of `service.ts`
  (`getObjectMetadata` verification) and the whole `getObjectMetadata` method in
  `supabase.ts` (git blame verified).
- Tenant `c56955c9` hero video (Asset `fd005f7e…`, READY) and poster (Asset
  `f28a3c63…`, READY) were created **2026-08-03** — BEFORE the regression — and
  still work.
- No hero Asset exists after 2026-08-12 in the DB. All newer hero storage
  objects are orphans (see §9).

---

## 3. Objective 1 — Upload Success Table (video/poster, signed path)

| Stage | File | Result today |
|---|---|---|
| 1. Client pre-check (magic bytes, mime, 12MB, 15s) | `client-upload.ts:56-73` | ✅ passes for valid MP4 |
| 2. `POST /api/media/upload-url` (validate, dedupe, quota pre-check) | `upload-url/route.ts` | ✅ returns signed payload |
| 3. `createSignedUploadUrl` | `supabase.ts:17` | ✅ returns signed URL |
| 4. Client PUT body → storage | `client-upload.ts:103` | ✅ **object lands in storage** |
| 5. `POST /api/media/register` | `register/route.ts` | ❌ **fails** |
| 6. `provider.exists()` | `supabase.ts:87` | ✅ true (object present) |
| 7. `provider.getObjectMetadata()` | `supabase.ts:99` | ❌ **throws "unknown"** |
| 8. Asset row + reference created | `service.ts:281-311` | ❌ **never reached** |
| 9. `updateHeroData` save (`assertHeroVideoWrite` → `assertHeroVideoAsset`) | `settings.actions.ts:33` | ❌ **never reached** (no asset) |
| 10. Hero persistence to `hero_data` Setting | `settings.service.ts:83` | ❌ never reached |
| 11. Preview / live render of the new media | — | ❌ preview shows old media only |

**Verdict:** the upload pipeline is fully healthy up to and including storage;
it breaks **only** at the metadata-verification step added in the regression.

---

## 4. Objective 2 — RCCF-59 Server-Side Hero Validation Trace

| Layer | Code | Status |
|---|---|---|
| Client UX pre-checks (mp4/mov, 12MB, 15s) | `client-upload.ts:62-73` | ✅ present |
| Fast-fail pre-check at signed-URL issuance | `assertHeroVideoPrecheck` `service.ts:661` | ✅ present (size only) |
| Authoritative validation from stored bytes | `assertHeroVideoObject` `service.ts:649` | ✅ present, **unreachable** (blocked by §2.4 step 7) |
| MP4 duration parser (moov/mvhd) | `src/lib/media/hero-validation.ts` `parseMp4Duration` | ✅ correct |
| Read object body via signed URL (never exposes service key) | `provider.readRange` `supabase.ts:110` | ✅ verified working (createSignedUrl probe returned a valid signed URL) |
| Write-time asset re-validation | `assertHeroVideoAsset` `service.ts:679` | ✅ present, gated behind a successful upload |
| Assigned-asset enforcement | `assertHeroVideoWrite` `settings.actions.ts:33` | ✅ present |

**Finding:** RCCF-59's server-side validation is correct and complete — it is
simply **never executed** for new uploads because `getObjectMetadata` throws
first. RCCF-59's own test exists: `tests/unit/rccf59-storage-hero.test.ts`.

---

## 5. Objective 3 — Why "unknown" (detailed)

See §2.3. The literal string `unknown` is produced by the `?? "unknown"`
fallback when `error` is `null`. It does not indicate an opaque/unknown error;
it indicates **"the .info() request succeeded but the code read a field that
does not exist in the response"** (`data.metadata.size`).

Secondary observation: the same wrong-field pattern exists in the return
object (`data.metadata.mimetype` → correct field is `data.contentType`), but
the throw at the guard makes the return unreachable today.

---

## 6. Objective 4 — Hero Background Image Lifecycle

| Concern | Finding |
|---|---|
| Field exists in data model | ✅ `backgroundUrl` / `backgroundAssetId` in `HeroDataType` (`src/config/hero.ts:40-41`) |
| Editor UI | ✅ `settings-form.tsx:242-255` "Hero Background Image" `MediaField` (folder `hero`, entityField `backgroundUrl`) |
| Persistence | ✅ `handleSaveBackground` → `updateHeroPartial({backgroundUrl, backgroundAssetId})` → `patchHeroData` |
| Aggregate resolution | ⚠️ `backgroundAssetId` is **NOT** resolved via `resolveUrls` (only video/poster are, `website-aggregate.service.ts:408-431`); `backgroundUrl` flows through as a baked raw URL |
| Runtime decision | ⚠️ `resolveHeroMedia` (`hero-media.ts:25-36`) uses background **only when BOTH video and poster are absent** — it is a last-resort fallback |
| Renderer | ✅ `HeroRenderer` renders `resolvedMedia === "background"` as `<img>` |
| Preview | ❌ `SettingsLivePreview` has **no background prop** — background is invisible in the editor preview |
| Production data | ✅ No tenant currently has `backgroundUrl` set (verified: 0 of 4 `hero_data` rows) |

**Verdict:** Background is a functioning-but-dead branch in production data.
It is not the cause of the upload error. **Do not remove it** without proof it
is unused in blueprints/themes (none exists yet); but it does not reach the
preview, and its aggregate handling is inconsistent with video/poster
(resolution by asset id).

---

## 7. Objective 5 — Preview Data Path

`SettingsLivePreview` (`src/features/settings/components/settings-live-preview.tsx`)
receives **raw, unsaved form state** via props from `SettingsForm`:

- `videoUrl` / `posterUrl` — raw state (with `lastVideoRef`/`lastPosterRef`
  sticky fallbacks, lines 40-51)
- alignments, `profileUrl`, `name`, `tagline`, `bio`, `liveBadgeText`,
  `showLiveBadge`

It does **NOT**:
- go through `WebsiteAggregate`
- call `resolveHeroMedia` / `resolveHeroMediaForRuntime`
- read `hero_data` from the DB
- render CTAs, social links, subtitle, or background

The preview is a self-contained mock frame (320px, phone/desktop toggles,
manual Video/Poster toggle) that shares only the `HeroMedia` component with the
live renderer.

---

## 8. Objective 6-7 — Preview vs Live Parity Matrix

| Field | Editor Preview (`SettingsLivePreview`) | Live (`HeroRenderer` via aggregate) |
|---|---|---|
| Video | ✅ raw `videoUrl` + `controls` | ✅ `mediaUrl` (resolved, fresh storage URL) |
| Poster | ✅ raw `posterUrl` | ✅ `mediaPoster` (resolved) |
| Resolution order | ⚠️ manual Video/Poster toggle | ✅ deterministic video→poster→background→placeholder |
| Background | ❌ not rendered | ✅ rendered when no video/poster |
| Name | ✅ | ✅ |
| Tagline | ✅ | ✅ |
| Bio | ✅ | ✅ |
| Subtitle | ❌ | ✅ (fallback when no bio) |
| CTAs (primary/secondary) | ❌ | ✅ |
| Social links | ❌ (3 grey placeholder circles) | ✅ real pills |
| Live badge | ✅ | ✅ |
| Profile picture | ✅ plain `<img>` | ✅ `CreatorImage` avatar |
| Alignment classes | `heroAlignmentClass` (plain `object-*`) | `responsiveAlignmentClass` (`@container/main` variants) |
| Aspect / frame | 320px, `aspect-video`, phone mock | full-width `aspect-[16/9]` / `@sm:16/8`, real page |
| Data source | unsaved form state | persisted aggregate from DB |

**Parity verdict:** Content fields the editor exposes (name/tagline/bio/live
badge/video/poster) are consistent in value, but the preview is a **stylized
mock** that omits CTA buttons, social links, subtitle, and background, and
bypasses the single media resolver. It cannot prove "what will ship".
(Shared `HeroMedia` component is the only true shared surface.)

---

## 9. Objective 8 — Legacy / Dead Pipelines

- `src/app/[domain]/_components/hero-banner.tsx` (`HeroBanner`) is **dead
  code** — no imports anywhere in `src`. It reads raw `videoUrl`/`posterUrl`
  directly (violates the IMPLEMENTATION-21 resolver rule) and uses plain
  `responsiveAlignmentClass`. Safe to flag for removal, but **read-only audit:
  not removed.**
- The active live path is
  `[domain]/page.tsx → getStorefrontData → StorefrontPage → DataBoundRenderer →
  HeroRenderer` — the single modern renderer consuming only resolved fields.
- The multipart `/api/media/upload` route (`mediaService.upload`) remains as a
  fallback when `prepare.signed` is null; it does NOT call `getObjectMetadata`,
  so **multipart uploads still succeed** — a useful comparison point.

---

## 10. Objective 9 — URL Truth

- `resolveUrls` (`service.ts:559`) → `getPublicUrl(storageKey)` →
  `{url}/storage/v1/object/public/influencer-images/{key}` — same canonical
  public URL form stored in `hero_data.videoUrl`/`posterUrl`.
- Verified for the one working tenant: DB `videoUrl` equals the public URL and
  its `storageKey` matches a real object in storage (`.info()` on
  `c56955c9-.../hero/c1e352c2-...mp4` returned `size: 7518452`, matching the
  Asset row size `7518452`). **URL truth holds** for registered assets.
- ⚠️ `register/route.ts` trusts the client-supplied `publicUrl` body field
  verbatim (`service.ts:291`). A caller could register any `publicUrl` with an
  owned `storageKey`. Should be derived server-side via `getPublicUrl`.
- ⚠️ `backgroundUrl` is stored/rendered as a baked raw URL and is **not**
  re-resolved from `backgroundAssetId` (§6) — a truth gap if storage URLs ever
  change (bucket policy, CDN migration).

---

## 11. Objective 10 — Security

| Concern | Finding | Severity |
|---|---|---|
| Tenant scoping on register | ✅ `tenantId` comes from the server session | — |
| **StorageKey ownership validation** | ⚠️ **`completeSignedUpload` never verifies `storageKey` starts with `${tenantId}/`.** A caller who can forge a storageKey could reference another tenant's existing object; `exists()` would pass and (post-fix) metadata would return size → an Asset row pointing at foreign bytes. Blocked today only because `getObjectMetadata` throws for everyone. | High (latent) |
| Client-controlled `publicUrl` | ⚠️ stored verbatim; should be recomputed server-side | Low |
| Signed URL exposure | ✅ service role never leaves the server; `readRange` uses signed URL + server fetch | — |
| Rate limiting | ✅ `checkRateLimit("media:upload-url:...")` 60/min per tenant | — |
| Magic-byte validation | ✅ client-side for videos; server-side mp4 parse on hero (when reached) | — |

**Recommended hardening (report only):** in `completeSignedUpload`, reject
`storageKey` not matching `/^${tenantId}\//` before `exists()`; derive
`publicUrl` from `storageKey` server-side.

---

## 12. Objective 11 — Quota & Orphaned Storage

Measured against production bucket `influencer-images`:

- **62 objects** exist in storage; only **4 Asset rows** exist in the DB.
- **23 hero objects** in storage; only **2 hero Asset rows** (both `c56955c9`,
  pre-regression). → **21 hero objects (~70 MB) are orphans** with no Asset row.
- DB accounting: 4 ACTIVE assets = 8,055,356 bytes; hero = 7,801,240 bytes.
  Storage actually holds far more (orphan bytes are unaccounted).
- **Why orphans exist:** every failing signed upload PUTs the body to storage
  (§2.4 step 4) and then throws at register (step 7) — the object is never
  deleted and no quota is charged.
- `countStorageUsage` (`storage.enforcement.ts`) counts Asset rows only, so
  orphan bytes are invisible to the quota system and to the Media Library.

**Recommended cleanup (report only):** a read-only reconciliation of storage
objects vs Asset rows, then a manual/targeted deletion pass for orphan hero
objects after the metadata fix lands (do not delete the 2 registered ones).

---

## 13. Objective 12 — Live Render Path

```
[domain]/page.tsx (force-dynamic)
  → getStorefrontData(domain, preview?, {homepage:true})
  → websiteAggregate.build()            resolves video/poster asset ids → fresh URLs
  → resolveHeroMediaForRuntime()        attaches resolvedMedia/mediaUrl/mediaPoster
  → layoutEngine.resolve()              composeSectionConfig hero branch (LayoutEngine.ts:203)
  → StorefrontPage → DataBoundRenderer  (StorefrontPage.tsx:208)
  → HeroRenderer (renderers.tsx:96)     reads ONLY resolvedMedia/mediaUrl/mediaPoster
```

Builder flows through the same aggregate + `DataBoundRenderer` path, so a
working upload would appear identically in Builder and Storefront.

---

## 14. Objective 13 — Test Coverage

| Test | Coverage | Gap |
|---|---|---|
| `src/lib/media/__tests__/media-service.test.ts:265-267` | asserts `completeSignedUpload` rejects when `getObjectMetadata` rejects | ❌ mocks the provider; never exercises the real `.info()` shape |
| `tests/unit/rccf59-storage-hero.test.ts` | RCCF-59 validation units | ✅ but provider-side metadata shape untested |
| `tests/unit/hero-unification.test.ts` | hero media resolver | ✅ resolver logic; not provider |
| `tests/e2e/production/hero.spec.ts` | e2e hero | ⚠️ depends on working upload |
| `src/lib/media/providers/*.test.ts` | **none exist** | ❌ no provider test at all — this is why the regression shipped |

The wrong-field read (`metadata.size` vs `size`) is untestable with the current
mocked-provider strategy; a provider integration test against the real
`.info()` response shape (or a fixture mirroring it) would have caught it.

---

## 15. Objective 14 — Classification

- **Type:** deterministic code defect (field-shape mismatch), not a race, not
  infrastructure, not a data problem.
- **Introduced:** commit `9b98612` (2026-08-12), RCCF-19 P1-S object
  verification added to `completeSignedUpload` + new `getObjectMetadata`.
- **Impact:** ALL signed uploads fail post-registration (hero video, hero
  poster, and every other folder via this path). Multipart fallback unaffected.
- **Blocker chain:** error → no Asset row → no `hero_data` update → preview/live
  keep prior media. Not an isolated hero bug; the error message just surfaces
  first on hero media in the settings editor.

---

## 16. Recommended Fix (smallest, safe) — report only

```ts
// src/lib/media/providers/supabase.ts — getObjectMetadata
const { data, error } = await this.client.storage.from(BUCKET).info(storageKey);
if (error || !data?.size) {
  throw new Error(`Supabase metadata failed: ${error?.message ?? "unknown"}`);
}
return {
  size: Number(data.size),
  mimeType: typeof data.contentType === "string" ? data.contentType : undefined,
};
```

No changes to schema, routes, client, resolver, renderers, or Stitch are
required for the primary defect.

**Follow-ups (separate, read-only findings — not part of this fix):**
1. Register-route hardening: server-side `storageKey` tenant-prefix check +
   server-derived `publicUrl` (§11).
2. Orphan reconciliation + cleanup for the 21 hero objects (§12).
3. Preview parity: surface CTA/social/background/subtitle in
   `SettingsLivePreview`, or drive preview through the aggregate resolver (§8).
4. Provider integration test for the real `.info()` shape (§14).
5. Remove dead `HeroBanner` (§9).
6. Reconcile `backgroundUrl` aggregate resolution with video/poster (§6/§10).

---

### Appendix A — Verification evidence

- Storage buckets: `["influencer-images"]`.
- `.info()` on a real hero object → `metadata: {}`, `size` top-level (probe).
- `createSignedUrl` on the same object → valid signed URL (readRange works).
- Storage inventory: 62 objects; 23 hero; 21 hero orphans.
- DB: 4 Asset rows (2 hero, READY/ACTIVE); 4 `hero_data` Setting rows; only
  `c56955c9` has video+poster set (URL truth verified against storage).
- git blame: `getObjectMetadata` and its caller both introduced by `9b98612`.
- storage-js `index.d.cts`: `FileObjectV2 { size?; content_type?; metadata? }`.