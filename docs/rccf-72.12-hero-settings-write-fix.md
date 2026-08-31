# RCCF-72.12 — Hero Settings Write Fix (Closure)

**Status:** Complete — implemented + verified. **No commit** (per ticket instruction).
**Date:** 2026-08-19
**Predecessor:** RCCF-72.8 (Wave 2 — Core Creator workflow). Closes **72.1-F1** (P1 — Save Identity always fails) and **72.1-F9** (P3 — terse "Invalid hero data" copy), plus the folded-in background **clear** defect. NOT in scope: 72.10 / 72.11 / 72.13 / 72.14 (implemented separately).

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

A creator can now save their Hero identity with or without a profile picture, and can clear the picture (or any hero field) — the actions that previously always failed with `"Invalid hero data"` — across all three tiers (Launch / Growth / Scale), verified end-to-end from the Settings form through the DB (JSONB delete-key contract) to the published storefront and Builder.

The write contract is now explicit and symmetric at the action boundary:

- **field OMITTED (undefined)** → leave unchanged (sparse patch).
- **field = null** → explicit CLEAR → JSON `null` → JSONB key removed.
- **field = "" (empty string)** → normalized to JSON `null` → same CLEAR result.

Server action errors are sanitized: known product sentences pass through, raw Prisma/DB internals collapse to a safe generic message, and validation failures return structured `fieldErrors` with creator-friendly copy (no more "Invalid hero data").

---

## 2. Original findings

### 72.1-F1 (P1) — Save Identity always fails
`handleSaveIdentity` sends `profilePictureUrl: null` / `profilePictureAssetId: null` when no profile picture exists; `heroPartialSchema` used `z.string().optional()`, which rejects `null` (only `undefined` is accepted). Server-action response was captured in 72.1:

```
{"success":false,"error":"Invalid hero data"}
```

A creator without a profile picture could **never** save their hero identity. The same defect broke the background **clear** path in `handleSaveBackground` (also sends `null`).

### 72.1-F9 (P3) — Terse error copy
The only user-visible error on this path was `"Invalid hero data"` — unhelpful for a creator.

---

## 3. Root cause

The server schema encoded "field absent" as the only valid "leave unchanged / empty" signal (`z.string().optional()` accepts `undefined` only). The form, by contrast, expresses "no picture / cleared picture" as an explicit `null`. The two models disagreed, so the legitimate client payload (`null`) failed Zod validation before the sparse-patch merge ever ran — and the failure surface leaked an internal zod phrase as the user-facing error.

Secondary gap: on any non-validation error the action returned the raw `Error.message` (which can be a Prisma/SQL/provider string) straight to the UI.

---

## 4. Canonical write contract (now enforced)

```
SettingsForm payload (omitted, "" , or null)
        │
        ▼
action layer: sparse loop — omit undefined, normalize "" → null, keep null
        │
        ▼
heroPartialSchema: every string field is z.string().nullable().optional()
        │
        ▼
SettingsService.patchHeroData: JSONB merge — JSON null REMOVES the key,
non-null values are set, absent keys are untouched
        │
        ▼
WebsiteAggregate → build-snapshot → snapshot hero (null → "" for render) → renderers
```

Persistence contract (unchanged, read-only): `SettingsService.patchHeroData` uses `kv."v" = 'null'::jsonb` to delete a key — JSON `null` is the canonical "clear". The action layer now feeds it correctly.

---

## 5. Implementation

### `src/actions/settings.actions.ts`
1. **`heroPartialSchema`** — all 18 string fields changed `z.string().optional()` → `z.string().nullable().optional()`.
2. **Sparse-loop rewrite** in both `updateHeroData` and `updateHeroPartial`:
   - OLD: `if (value !== undefined && value !== null)` — dropped explicit `null` (so clears were impossible) and required non-null.
   - NEW: `if (value === undefined) continue; sparseData[key] = value === "" ? null : value;` — only omission means "leave unchanged"; `""` and `null` both become JSON `null` (clear).
3. **Validation failures** now return `{ success: false, error: HERO_SAVE_VALIDATION_ERROR, fieldErrors }` where `HERO_SAVE_VALIDATION_ERROR = "Unable to save your hero settings. Please review your changes and try again."` — no more "Invalid hero data".
4. **`safeHeroSaveError(error)`** — conservative classifier (same rule as `publish-error-messages.ts`): known technical hints (prisma/sql/database/postgres/connection/timeout/ECONN*/constraint/provider/stack traces/etc.) collapse to `HERO_SAVE_GENERIC_ERROR = "Unable to save your hero settings. Please try again."`; product-readable sentences pass through. Catch blocks use it; the auth guard's `"Unauthorized"`/`"Forbidden"` pass-through is preserved.

### `src/features/settings/components/settings-form.tsx`
- Identity clear flow unchanged (`profilePictureUrl: (overrides?.profilePictureUrl ?? profilePictureUrl) || null`) — now supported server-side.
- Added `backgroundSave` pending/error/success state to surface background clear errors (background half of F1) instead of swallowing them.

### No other production files changed.

---

## 6. Files changed (this ticket)

| File | Change |
|---|---|
| `src/actions/settings.actions.ts` | nullable schema; sparse-loop semantics; structured + sanitized errors |
| `src/features/settings/components/settings-form.tsx` | backgroundSave error surfacing |
| `tests/unit/rccf72-12-hero-settings-write-fix.test.tsx` | new — 24 tests (behavioral + source guardrails) |

**Diff discipline note:** the working tree carries many uncommitted changes from prior RCCF tickets; this ticket touched only the 3 files above. `settings.service.ts`, `website-aggregate.service.ts`, `build-snapshot.ts`, `renderers.tsx` are read-only dependencies verified intact — not modified.

---

## 7. Null/optional semantics (canonical, documented in code + tests)

| Value sent by client | Meaning | Server action | JSONB result |
|---|---|---|---|
| field omitted (`undefined`) | leave unchanged | skipped (`continue`) | key untouched |
| `null` | explicit clear | passed as `null` | key REMOVED |
| `""` (empty string) | cleared FormData | normalized to `null` | key REMOVED |
| `"text"` | set | passed as-is | key SET |

Renderer parity: absent profile picture → no avatar; empty `profilePictureUrl` → no avatar (renderers treat `""` as absent) — verified in unit tests and in-browser.

---

## 8. Test results

- **Focused `tests/unit/rccf72-12-hero-settings-write-fix.test.tsx`: 24/24 pass** — behavioral: save w/ picture; save w/ no picture; save w/ `null` picture; clear picture; background clear; `""` → null normalization; title/subtitle save without picture; sparse preservation (untouched keys unchanged); empty partial no-op; structured `fieldErrors` (no "Invalid hero data", no zod internals); DB-error sanitization → generic message; product-error pass-through; `Unauthorized` pass-through; FormData path. Renderer: avatar renders with URL, absent with empty. Source guardrails: nullable schema, `if (value === undefined) continue`, no stale `value !== null` guard, clear expression present, `backgroundSave` present, `'null'::jsonb` persistence contract present.
- **Full suite: 3630 tests / 239 files — PASS.** (Known RCCF-68 jsdom "Not implemented: navigation" warning appears but does not fail the run; the 72.9-documented flaky `rccf68-retry-catalog-timeout` test passed this run.)
- `npx tsc --noEmit` clean · `npx prisma validate` valid · `npx prisma generate` OK · `npm run build` OK · `npx eslint` on the 3 touched files: 0 errors (1 pre-existing warning: `setHeroSubtitle` unused — not introduced here) · `git diff --check` clean (only pre-existing CRLF warnings).

---

## 9. Browser verification (Playwright MCP, dev server :3000)

QA accounts staged on the dev DB (password `Audit72!QaPass`, bcryptjs cost 12 matching `scripts/recovery-seed.ts`): Launch (`rccf7151-launch`, no picture, 0 snapshots), Growth (`rccf7151-growth`, 1×1 PNG data-URI picture staged, 6 snapshots), Scale (`rccf-7164-scale-qa`, 1 snapshot).

| Check | Launch | Growth | Scale |
|---|---|---|---|
| A. Save identity WITH picture present | — | ✓ PASS (title + picture persisted; preview shows avatar) | — |
| B. Save identity with NO picture | ✓ PASS | ✓ PASS | ✓ PASS |
| C. Remove picture → Save | — | ✓ PASS (field → "No media selected yet", no avatar in preview) | — |
| D. Reload → persists | ✓ PASS | ✓ PASS | ✓ PASS |
| E. Builder reflects saved identity | ✓ PASS | ✓ PASS | ✓ PASS |
| F. Publish → storefront reflects | ✓ PASS (v1) | ✓ PASS (v7) | ✓ PASS (v2) |
| Mobile 390 storefront | — | ✓ PASS (no horizontal overflow, hero renders) | — |

No "Invalid hero data" / "Unable to save" errors anywhere. Screenshot: `screenshots/rccf72-12-growth-storefront-mobile390.png`.

**Login note:** the QA script's `waitForURL(/\/admin|\/builder|\/onboarding/)` matched `/admin/login` itself and reported a false negative; the fix waits for a post-login URL (`/admin/dashboard`). The auth path itself was verified healthy (POST `/api/auth/callback/credentials` → 200; all three accounts logged in).

---

## 10. DB contract verification

Post-QA read of `Setting(hero_data)` + `PublishSnapshot`:

| Tenant | hero_data keys | hero_data title | live snapshot title | profilePictureUrl |
|---|---|---|---|---|
| Launch | `bio, name, tagline, title` | `Launch NoPic Title QA 2026-08-18` | v1 matches | key ABSENT (no picture) |
| Growth | `bio, name, tagline, title` | `Growth NoPic Title QA 2026-08-18` | v7 matches | key REMOVED after clear (was staged) |
| Scale | `name, socialLinks, title, videoUrl` | `Scale NoPic Title QA 2026-08-18` | v2 matches | key ABSENT |

Growth is the decisive case: its staged picture was cleared via the form, and the `profilePictureUrl` key was **deleted** from `hero_data` (JSON `null` → JSONB delete-key) — proving the clear path persists correctly at the source of truth. Snapshots normalize to `""` for rendering (verified no avatar on storefront).

---

## 11. Regression checks

- **Builder surface has no hero write authority** — the existing guardrail `tests/unit/rccf70-4-5-builder.test.tsx` stays green (untouched); Builder reflects hero_data read-only (verified per-tier).
- **Preview/Live parity** — hero renders identically in the settings Live Preview, Builder canvas, and published storefront (all show the saved title; avatar only when a picture exists).
- **Publish quota/allowance** — Launch (0/3 → 1/3), Growth (6/10 → 7/10), Scale (Unlimited) each incremented exactly once per publish; no double-charge, no quota errors.
- **Frozen surfaces** — Prisma schema, billing, plans, capabilities, auth, lifecycle, publishing architecture, Theme Experience, Hero ownership, Builder/storefront/navigation architecture: all unchanged (verified in diff scope).

---

## 12. Remaining risks

- **Success toast is ephemeral.** The form's `flash(true)` triggers `router.refresh()` ~50ms after a successful save, and the refreshed heroData changes the form's `key`, remounting it and clearing the client-side success banner. Success is still unambiguous (input persists, preview updates, status → "Changes pending"), but a creator may not notice the toast. Documented; cosmetic, not a correctness defect.
- **`setHeroSubtitle` unused warning** (pre-existing, not introduced) — the subtitle field renders but is not wired to a save; unchanged scope.

---

## 13. Frozen surfaces

Per ticket constraints, unchanged: Prisma schema, billing, plans, capabilities, onboarding, lifecycle, publishing, Theme Experience, Hero ownership (remains Settings/`hero_data`), Builder architecture, storefront, navigation. No data created beyond normal QA-tier publishes.

---

## 14. Final verdict

**A — VERIFIED.**

The previously un-saveable "Save Identity" flow (72.1-F1, P1) and the terse-error defect (72.1-F9, P3) are closed, plus the background-clear variant. Every state in the canonical contract (omitted / null / empty / set) is proven by 24 unit tests and by browser QA across all three tiers from form → DB → snapshot → storefront/Builder. No frozen surface was touched and the full test suite stays green.

```
RCCF-72.12 STATUS:   COMPLETE (A — VERIFIED). No commit.
FILES:               settings.actions.ts, settings-form.tsx,
                     tests/unit/rccf72-12-hero-settings-write-fix.test.tsx (new).
ROOT CAUSE:          z.string().optional() rejected explicit null from the form
                     ("no picture" / "cleared picture") → "Invalid hero data".
FIX:                 all string hero fields nullable().optional(); sparse loop
                     omits only undefined and normalizes "" → null (JSONB
                     delete-key clear); structured fieldErrors; sanitized
                     technical errors; backgroundSave surfaced in the form.
TESTS:               24 focused pass; full suite 3630 pass; tsc/build/prisma/eslint clean.
BROWSER QA:          Launch + Growth + Scale — B/D/E/F PASS; Growth A/C PASS;
                     mobile 390 PASS; DB contract verified (clear deletes key).
VERDICT:             A — VERIFIED.
```