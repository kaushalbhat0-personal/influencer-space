# RCCF-72.9 — Preview Security Closure

**Status:** Complete — audit + implementation verified. **No commit** (per ticket instruction).
**Date:** 2026-08-19
**Predecessor:** RCCF-72.8 §S1 (P1 SECURITY — anonymous `?preview=true` draft-content exposure).
**Prior artifact:** `docs/rccf-72.9-preview-security-boundary.md` (same ticket, earlier session) — this document supersedes it with a fresh full audit + verification run on the current working tree.

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

The S1 P1 SECURITY finding is closed. The canonical server-side boundary is a single predicate, `canPreviewTenant(tenantId)`, that compares the authenticated session's JWT `tenantId` against the tenant resolved from the requested slug. The preview branch of the storefront loader is now gated on that predicate; every other path serves the persisted PublishedSnapshot.

Proven in-browser and by unit tests:

| Scenario | Result |
|---|---|
| Anonymous + `?preview=true` | published snapshot, byte-identical to live (no banner, no draft) |
| Authenticated owner + `?preview=true` + own tenant | draft snapshot (banner + draft-only marker) |
| Authenticated user + `?preview=true` + different tenant | published snapshot of the requested tenant (denied) |
| Anonymous + normal URL | published only (unchanged) |
| URL/query variants (`?preview=true&x=1`, `?PREVIEW=true`, `?preview=1`, `?preview`, trailing-slash) | all denied anonymously |
| Builder canvas preview | works (owner session) |
| Published storefront (mobile 390) | intact, no overflow, products render |

---

## 2. Original Vulnerability (reproduced this ticket)

The storefront routes treated `searchParams.preview === "true"` as a pure **rendering hint**:

- `src/app/[domain]/page.tsx` and `src/app/[domain]/[slug]/page.tsx` passed `isPreview` straight into `getStorefrontData(slug, preview)`.
- The loader's `preview` branch rebuilt the **live draft aggregate** (`websiteAggregateService.buildWithDiagnostics` + `navigationService.getOrGenerate` + `BuilderService.load`) with **no ownership or authentication check**.
- Any anonymous visitor who knew/guessed a subdomain could reach `?preview=true` and receive unpublished draft content (draft timeline items, checkout placeholders, plan-gated theme/config drafts).

**Reproduction on the current tree (before accepting the fix):** the draft marker for tenant A (`rccf-720-audit`, tenant `147dc2d1-979a-48c3-b028-32f4d4af8950`) exists in the DB as `TimelineEvent` "Quota Probe Milestone / 2027 / probe" — **absent from published snapshot v3**. Pre-fix, `GET /rccf-720-audit?preview=true` rendered that marker with a "PREVIEW MODE — CHANGES ARE NOT PUBLIC" banner (evidence: RCCF-72.2 §12, RCCF-72.8 §S1).

---

## 3. Root cause

The preview branch was not authorization-gated; it selected the snapshot based on the caller's *request* rather than the caller's *entitlement to the draft*. The loader had no awareness of viewer identity and therefore could not decide which snapshot the viewer was entitled to. There is no signed preview token in the system; the only identity primitive available server-side is the NextAuth JWT session (`getServerSession` → `session.user.tenantId`).

---

## 4. Architecture Invariant & Option Selection

**Invariant (must hold):** *Draft/preview content is retrievable only by an authenticated user whose session tenant equals the tenant being previewed; the published snapshot is public to everyone.*

**Selected option: server-side session-tenancy gate in the loader** (the minimal fix).

Trace of the request:

```
GET /{slug}?preview=true
  → middleware.ts: storefront slug classified as public (always-allow), x-tenant-host set from slug, no preview special-casing
  → [domain]/page.tsx (or [domain]/[slug]/page.tsx): searchParams.preview === "true" → isPreview
  → getStorefrontData(slug, preview)
      → tenant resolution: prisma.tenant.findFirst(OR subdomain | customDomain = slug)
      → preview auth: canPreviewTenant(tenant.id)
            = getServerSession(authOptions)?.user?.tenantId === tenant.id
      → authorized  → draft snapshot (Builder Runtime full-page: layout + live content) + previewAuthorized=true
      → denied/anon → published snapshot (getPublishedPageData) + previewAuthorized=false
  → StorefrontPage renders preview chrome ONLY when previewAuthorized === true
```

**Rejected alternatives:**
- **Signed/opaque preview token** — no existing token infrastructure; overkill for a single-origin deployment where the JWT session already distinguishes the owner. Rejected per "do not invent a new preview authorization system".
- **Redirect-to-login on unauthorized preview** — would break the documented public-storefront contract (RCCF-02: published snapshot is public; an anonymous visitor must never be bounced to a wall). Rejected; the unauthorized path degrades to the public snapshot instead.
- **Client-side-only hiding of the banner** — would hide the chrome but still leak draft data in the HTML/RSC payload. Rejected ("no client-side-only protection").
- **`requireTenant`-style route guard** — would deny the *whole route* including the public snapshot for any non-owner. Rejected; the loader-level gate preserves the public storefront.

---

## 5. Implementation Changes

| File | Change |
|---|---|
| `src/lib/storefront/preview-auth.ts` | **new** — canonical `canPreviewTenant(tenantId)` predicate: `getServerSession(authOptions)` and compare `session.user.tenantId === tenantId`. Anonymous/expired/null-tenant sessions → `false`. |
| `src/lib/storefront/storefront-loader.ts` | `StorefrontData` gains `previewAuthorized: boolean`; the preview branch is gated on `preview && (await canPreviewTenant(tenant.id))`; all return sites set the flag (`true` only on the authorized draft path); unauthorized `preview=true` falls through to the published-snapshot path. |
| `src/app/[domain]/page.tsx` | `isPreview={data.previewAuthorized}` (was `isPreview`) — banner/checkout-placeholders/goal-live-read/maintenance-live-read render only for an authorized owner. |
| `src/app/[domain]/[slug]/page.tsx` | `isPreview={data.previewAuthorized}` (was `isPreview`) — same gating for named pages. |
| `tests/unit/rccf72-9-preview-security.test.ts` | **new** — 9 tests (see §7). |

**Diff discipline:** the `storefront-loader.ts` diff in the working tree also contains pre-existing **RCCF-71.2 theme-experience** lines (themeRegistry/experience imports, `themeConfig` select, experience baking into the preview snapshot). Those lines are from a prior ticket, not this one; this ticket layered only the RCCF-72.9 lines (`previewAuthorized`, `canPreviewTenant` import/gate, flag at every return site). No plan/capability/billing/lifecycle/publishing/schema/Hero/Theme/navigation changes.

---

## 6. Behavior Preservation

- **Published storefront:** the published path (`getPublishedPageData`) is untouched; anonymous normal and anonymous `?preview=true` render the published snapshot identically.
- **Builder preview:** the Builder canvas renders its own components (independent of the storefront `?preview=true` route) and is untouched; the dashboard "Preview Draft" affordance (`StorefrontStatusCard` → `window.open(storefrontUrl?preview=true)`) is the same-origin authenticated path this boundary now correctly allows for the owner.
- **Snapshot immutability:** no publishing-snapshot reads/writes changed; no snapshot is created by preview.
- **Tenant isolation:** the tenant is always resolved from the request slug and ownership compared against the resolved tenant id — a preview can never fall back to another tenant's snapshot.

---

## 7. Regression Coverage

`tests/unit/rccf72-9-preview-security.test.ts` (9 assertions, source-level + behavior-level):

| Test | Pins |
|---|---|
| `canPreviewTenant` allows owner | session tenant == target → `true` |
| `canPreviewTenant` denies anonymous | no session → `false` |
| `canPreviewTenant` denies cross-tenant | different session tenant → `false` |
| `canPreviewTenant` denies super-admin/agency | null `tenantId` → `false` |
| anonymous normal storefront | `getPublishedPageData` called, `buildRuntimeSnapshot` NOT called, snapshot kind `published` |
| anonymous `?preview=true` | denied → `getPublishedPageData` called, no draft, `previewAuthorized=false` |
| owner `?preview=true` | `buildRuntimeSnapshot` called, no published read, snapshot kind `draft` |
| wrong-tenant `?preview=true` | denied → published of the requested tenant |
| slug-resolved tenant mismatch | tenant resolved from slug; session owner of another tenant → denied |

Guardrail style: asserts the **correct** branch ran (draft builder for owner) AND the **wrong** branch did not (published read for anonymous/wrong-tenant, and vice-versa).

---

## 8. Verification Results

| Gate | Command | Result |
|---|---|---|
| Typecheck | `npx tsc --noEmit` | PASS |
| Focused tests | `npx vitest run tests/unit/rccf72-9-preview-security.test.ts` | **9/9 PASS** |
| Full suite | `npx vitest run` | **241 files / 3669 tests PASS** (1 pre-existing jsdom "navigation to another Document" warning noise, not a failure — same class documented in RCCF-72.7/72.8/72.9-boundary) |
| Build | `npm run build` | PASS (exit 0) |
| Prisma | `npx prisma validate` + `npx prisma generate` | PASS (schema valid, client generated) |
| ESLint | `npx eslint` on all touched files | PASS |
| Whitespace | `git diff --check` | PASS (only pre-existing CRLF warnings) |
| Dev server | `npm run dev` (localhost:3000) | READY (reused; restarted once for the build, healthy again) |

---

## 9. Browser Evidence (Playwright + curl, 2026-08-19)

| Check | Result |
|---|---|
| A. Anonymous live `/rccf-720-audit` | 200, published only, 366 chars, no banner, no "Quota Probe" |
| B. Anonymous `/rccf-720-audit?preview=true` | 200, **denied** — byte-identical published content to A (only diff = CSS cache-busting `?v=`), `previewMode:false` in RSC payload |
| B2. `/rccf-720-audit?preview=true&x=1` | 200, denied, no draft |
| B3. `/rccf-720-audit/?preview=true` (trailing slash) | 308→200, denied, no draft |
| B4. `/rccf-720-audit?PREVIEW=true`, `?preview=1`, `?preview` | 200, denied (only exact `preview === "true"` is honored) |
| B5. `/rccf-720-audit/products?preview=true` | 404 (no such published page; no draft leak) |
| C. Authenticated owner (tenant A) `/rccf-720-audit?preview=true` | 200, **allowed** — banner "Preview Mode — changes are not public" + draft "Quota Probe Milestone" present, 838 chars |
| D. Authenticated owner A → `/rccf7151-growth?preview=true` (tenant B) | 200, **denied** — B's published snapshot, 326 chars, no banner, no draft (byte-identical to B's live) |
| E. Builder `/builder` (owner session) | 200, renders, 0 console errors |
| F. Published storefront mobile 390 | 200, no horizontal overflow, products render, no draft |

Screenshots: `screenshots/rccf72-9-owner-preview-draft.png` (C), `screenshots/rccf72-9-anonymous-preview-denied.png` + `-full.png` (B).

---

## 10. Security Invariants (proven)

| Invariant | Result |
|---|---|
| Anonymous users cannot retrieve draft/preview content | ✓ (B/B2–B5) |
| Authentication alone cannot access another tenant's draft | ✓ (D) |
| Tenant ownership enforced server-side | ✓ (`canPreviewTenant`, unit tests) |
| Published storefront remains publicly accessible | ✓ (A/F) |
| Authenticated authorized Builder preview keeps working | ✓ (C/E) |
| Preview URLs cannot bypass authorization through query params | ✓ (B2–B5; only exact `preview === "true"` honored) |
| No draft content leaks through RSC/API responses | ✓ (RSC payload `previewMode:false`, `Quota Probe` absent in full HTML/stream for anonymous) |
| No cross-tenant preview access | ✓ (D + slug-resolved mismatch unit test) |
| Snapshot immutability unchanged | ✓ (no snapshot writes; published path untouched) |

---

## 11. Diff Discipline

- **In scope (this ticket):** `preview-auth.ts` (new), `storefront-loader.ts` (RCCF-72.9 lines), `[domain]/page.tsx`, `[domain]/[slug]/page.tsx`, `tests/unit/rccf72-9-preview-security.test.ts` (new), `docs/rccf-72.9-preview-security-closure.md` (new).
- **Pre-existing working-tree changes (not touched, not reverted):** RCCF-71.2 theme-experience lines inside `storefront-loader.ts`; the broader working tree carries many other uncommitted prior-ticket files (settings, builder, billing, publishing, dashboard, etc.) — untouched.
- **Frozen surfaces:** Prisma schema, migrations, billing, plans, capabilities, auth (except the new read-only session predicate), lifecycle, publishing snapshot creation, Theme Experience runtime, Hero, Builder architecture, navigation, storefront content model, middleware routing, pricing. No data created; no publishes made.

---

## 12. Risks & Edge Cases

- **Custom-domain preview (Scale, cross-origin):** `buildSiteUrlForAdmin`/`buildPreviewUrl` return `https://{customDomain}` when a custom domain is set; a preview opened there is cross-origin to the platform, so the NextAuth cookie may not carry and `canPreviewTenant` would deny (published snapshot). No custom-domain storefront serving was observed on any QA tenant (all previews are platform-host `/{slug}`), so this is out of scope; if custom-domain serving is enabled later, a signed short-lived preview token would be required. Documented, not a regression of current behavior.
- **Agency-managed creators:** agency staff/agency-admin sessions carry `tenantId: null`; they cannot preview a client's draft via `?preview=true`. No such consumer exists today; strict tenant-ownership is the correct minimal boundary (per RCCF-72.8 recommendation).
- **Super-admin/SUPPORT/READ_ONLY preview:** no `tenantId` → denied. No such preview consumer exists; acceptable.
- **Session invalidation:** the NextAuth `session` callback already hard-expires sessions for deleted users / role changes, so a stale `tenantId` cannot outlive the user.

---

## 13. Final Verdict

**A — VERIFIED.**

`who is allowed to preview` (authenticated tenant owner) → `which tenant they are previewing` (resolved from the request slug) → `which snapshot they receive` (draft for owner, published otherwise) are each explicitly demonstrated by unit tests and browser evidence. The S1 P1 SECURITY finding is closed without weakening published storefront access, cross-tenant isolation, or the legitimate authenticated creator preview flow.

```
RCCF-72.9 STATUS:    COMPLETE (A — VERIFIED). No commit.
FILES:               src/lib/storefront/preview-auth.ts (new),
                     src/lib/storefront/storefront-loader.ts,
                     src/app/[domain]/page.tsx,
                     src/app/[domain]/[slug]/page.tsx,
                     tests/unit/rccf72-9-preview-security.test.ts (new),
                     docs/rccf-72.9-preview-security-closure.md (new).
SECURITY EVIDENCE:   anonymous ?preview=true -> published (366B, no banner, no draft);
                     owner ?preview=true -> draft (banner + Quota Probe, 838B);
                     cross-tenant ?preview=true -> published (326B, denied).
                     "Quota Probe" not retrievable anonymously via live, preview,
                     or URL/query variants; RSC payload carries previewMode:false.
TESTS:               9 focused pass; full suite 3669 pass.
BUILD:               tsc clean - vitest - build OK - prisma validate/generate OK - eslint clean.
VERDICT:             A - VERIFIED.
```