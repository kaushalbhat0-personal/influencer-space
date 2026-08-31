# RCCF-72.9 — Preview Security Boundary (Closure)

**Status:** Complete — implemented + verified. **No commit** (per ticket instruction).
**Date:** 2026-08-18
**Predecessor:** RCCF-72.8 (S1 — P1 SECURITY blocker). Closes the anonymous `?preview=true` draft-content exposure.

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

The anonymous unpublished-content exposure (S1) is closed with a minimal server-side authorization boundary. The invariant is now enforced:

- **Anonymous + `?preview=true`** → receives the **published snapshot**, rendered **identically to the public storefront** (no preview banner, no draft content).
- **Authenticated creator + `?preview=true` + their own tenant** → receives the **draft** snapshot (Builder-runtime full page).
- **Authenticated user + `?preview=true` + a different tenant** → **denied** (published snapshot only).
- **Anonymous + normal URL** → published content only (unchanged).

The draft-only marker `Quota Probe` (and the checkout placeholder) is no longer retrievable anonymously through the normal storefront, `?preview=true`, or alternate URL/query combinations.

---

## 2. Original vulnerability

`src/app/[domain]/page.tsx` and `src/app/[domain]/[slug]/page.tsx` passed `searchParams.preview === "true"` straight into `getStorefrontData(slug, preview)`. The loader's `preview` branch rebuilt the **live draft aggregate + fresh navigation** with **no ownership/auth check**. Any anonymous visitor who knew/guessed a subdomain could reach `?preview=true` and see unpublished draft content (draft timeline items, checkout placeholders, plan-gated theme/config drafts).

Re-proven in RCCF-72.8: anonymous `GET /rccf-720-audit?preview=true` → 200 with "PREVIEW MODE — CHANGES ARE NOT PUBLIC" banner and draft-only `Quota Probe Milestone` timeline content.

---

## 3. Root cause

The preview branch was treated as a **rendering hint** rather than an **authorization-gated snapshot selection**. The storefront loader had no awareness of the viewer's identity, so it could not decide *which snapshot* the viewer was entitled to. There is no signed preview token; the only identity primitive is the NextAuth JWT session.

---

## 4. Authorization model

Single server-side predicate (`src/lib/storefront/preview-auth.ts`):

```
canPreviewTenant(tenantId) =
  session != null
  AND session.user.tenantId != null
  AND session.user.tenantId === tenantId
```

- **Anonymous / expired session** → `false`.
- **Cross-tenant** → `false`.
- **Tenant owner** → `true`.
- Super-admin / agency sessions (no `tenantId`) → `false` (no legitimate preview consumer exists for them; strict by design).

The storefront loader resolves the tenant from the request slug (`subdomain`/`customDomain`), then:
- `preview=true` **and** `canPreviewTenant(tenant.id)` → draft snapshot (`previewAuthorized: true`).
- otherwise → published snapshot (`previewAuthorized: false`).

`StorefrontData` now carries `previewAuthorized`, so the routes render the preview chrome (`isPreview`) **only when actually authorized** — an unauthorized request degrades to the public storefront byte-for-byte, never to a login wall or a 404.

---

## 5. Implementation

1. **`src/lib/storefront/preview-auth.ts`** (new) — canonical `canPreviewTenant(tenantId)` predicate using `getServerSession(authOptions)` + tenant-id equality. Not a redirect (unlike `requireTenant`); the public snapshot path is preserved.
2. **`src/lib/storefront/storefront-loader.ts`** — `StorefrontData` gains `previewAuthorized: boolean`; the preview branch is gated on `canPreviewTenant(tenant.id)`; all return sites set the flag; unauthorized `preview=true` falls through to the published-snapshot path.
3. **`src/app/[domain]/page.tsx`** + **`src/app/[domain]/[slug]/page.tsx`** — `isPreview={data.previewAuthorized}` (was `isPreview`), so the preview banner/checkout-placeholders/goal-live-read/maintenance-live-read render only for an authorized owner.

No plan/capability/billing/lifecycle/publishing/schema/Hero/Theme/navigation changes.

---

## 6. Files changed (this ticket)

| File | Change |
|---|---|
| `src/lib/storefront/preview-auth.ts` | new — `canPreviewTenant` |
| `src/lib/storefront/storefront-loader.ts` | `previewAuthorized` flag + preview-branch gating |
| `src/app/[domain]/page.tsx` | `isPreview={data.previewAuthorized}` |
| `src/app/[domain]/[slug]/page.tsx` | `isPreview={data.previewAuthorized}` |
| `tests/unit/rccf72-9-preview-security.test.ts` | new — 9 tests |

**Diff discipline note:** `storefront-loader.ts` already carried uncommitted RCCF-71.2 theme-experience changes (unrelated) in the working tree; this ticket layered only the RCCF-72.9 lines on top. `build-snapshot.ts` / `LayoutEngine.ts` show as modified from prior tickets and were **not** touched here.

---

## 7. Security invariants (proven)

| Invariant | Result |
|---|---|
| Anonymous + `?preview=true` + unpublished snapshot = DENIED | ✓ (published snapshot, no banner/draft) |
| Authenticated creator + `?preview=true` + own tenant = ALLOWED | ✓ (draft) |
| Anonymous + normal URL = PUBLISHED only | ✓ |
| User A + tenant B preview = DENIED | ✓ |
| Published storefront remains public | ✓ |
| Preview cannot fall back to another tenant's snapshot | ✓ (tenant resolved from slug, ownership checked) |
| No plan/capability/billing checks in the boundary | ✓ |

---

## 8. Test results

- **Focused `tests/unit/rccf72-9-preview-security.test.ts`: 9/9 pass** — covers `canPreviewTenant` (authorized / anonymous / cross-tenant / null-tenant) and `getStorefrontData` snapshot selection (anonymous normal → published; anonymous preview → published; owner preview → draft; wrong-tenant preview → published; slug-resolved tenant mismatch → published).
- **Full suite: 3606 tests — 1 pre-existing flaky failure** (`tests/unit/rccf68-retry-catalog-timeout.test.ts`, 5s-timeout jsdom navigation; passes in isolation — the same flake documented in RCCF-72.7/72.8, unrelated to this ticket).
- `npx tsc --noEmit` clean · `npx prisma validate` valid · `npx eslint` clean on touched files · `npm run build` OK · `git diff --check` clean (only pre-existing CRLF warnings).

---

## 9. Browser verification (dev server, Playwright)

| Check | Result |
|---|---|
| A. Anonymous live storefront | 200, published only (no banner, no draft) |
| B. Anonymous `?preview=true` | 200, **denied** — identical body to live (366 chars), no banner, no draft |
| B2/B3. `?preview=true&x=1`, trailing-slash `/?preview=true` | denied, no draft leak |
| C. Authenticated owner `?preview=true` | 200, banner + draft (`Quota Probe` present, 838 chars) |
| D. Authenticated wrong-tenant `?preview=true` | 200, denied (published, 366 chars, no banner) |
| D2. Authenticated owner (own tenant) | 200, draft banner |
| E. Builder | 200, no page errors |
| F. Published storefront (mobile 390) | 200, products render |

---

## 10. Tenant-isolation verification

Cross-tenant denial proven in-browser: tenant B (Growth) requesting tenant A's `?preview=true` receives A's **published** snapshot (366 chars) with no preview banner and no draft marker; B's own `?preview=true` returns B's draft. Tenant resolution is by slug (`subdomain`/`customDomain`) and ownership is compared against the resolved tenant id — a preview can never fall back to another tenant's snapshot.

---

## 11. Published storefront regression

None. The published path (`getPublishedPageData`) is untouched; anonymous normal and anonymous `?preview=true` now both render the published snapshot identically. Live storefront verified at desktop + mobile 390 (products/hero/footer intact).

---

## 12. Builder preview regression

The Builder canvas renders its own components (independent of the storefront `?preview=true` route) and is untouched. The dashboard "Preview Draft" affordance (`StorefrontStatusCard` → `window.open(storefrontUrl?preview=true)`) is the same-origin authenticated path that this boundary now correctly allows for the owner (proven by test C).

---

## 13. Remaining risks

- **Custom-domain preview (Scale, cross-origin):** `buildSiteUrlForAdmin` returns `https://{customDomain}` when a custom domain is set. A preview opened on a custom domain is cross-origin to the platform, so the NextAuth session cookie may not carry, and `canPreviewTenant` would deny preview. No custom-domain storefront serving was observed in any QA tenant (all previews are platform-host `/{slug}`), so this is out of scope; if custom-domain serving is enabled, a signed short-lived preview token would be required. **Documented, not a regression of current behavior.**
- **Agency-managed creators:** agency staff have no `tenantId`; previewing a client's draft would need agency-tenant authorization. No such consumer exists today; strict tenant-ownership is the correct minimal boundary.
- **Super-admin preview:** a super-admin (no `tenantId`) cannot preview a tenant draft via `?preview=true`. No super-admin preview consumer exists; acceptable.

---

## 14. Frozen surfaces

Per ticket constraints, unchanged: Prisma schema, billing, plans, capabilities, onboarding, lifecycle, publishing snapshot creation, Theme Experience, Hero ownership, Builder architecture, storefront content model, navigation, pricing. No data created.

---

## 15. Final verdict

**A — VERIFIED.**

`who is allowed to preview` (authenticated tenant owner) → `which tenant they are previewing` (resolved from the request slug) → `which snapshot they receive` (draft for owner, published otherwise) are each explicitly demonstrated by unit tests and browser evidence. The S1 P1 SECURITY finding is closed without weakening published storefront access, cross-tenant isolation, or the legitimate authenticated creator preview flow.

```
RCCF-72.9 STATUS:    COMPLETE (A — VERIFIED). No commit.
FILES:               preview-auth.ts (new), storefront-loader.ts, [domain]/page.tsx,
                     [domain]/[slug]/page.tsx, rccf72-9-preview-security.test.ts (new).
SECURITY EVIDENCE:   anonymous ?preview=true → published (366B, no banner, no draft);
                     owner ?preview=true → draft (banner + Quota Probe, 838B);
                     cross-tenant ?preview=true → published (366B, denied).
                     "Quota Probe" not retrievable anonymously via live, preview,
                     or URL/query variants.
TESTS:               9 focused pass; full suite 3606 (1 pre-existing flaky rccf68, unrelated).
BUILD:               tsc clean · vitest · build OK · prisma validate valid · eslint clean.
VERDICT:             A — VERIFIED.
```
