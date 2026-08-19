# RCCF-72.12 — Save Identity Remediation (Closure)

**Status:** Complete — implemented + verified. **No commit** (per ticket instruction).
**Date:** 2026-08-19
**Predecessor:** RCCF-72.8 (Wave 2 — Core Creator workflow). Closes **72.1-F1** (P1 — Save Identity always fails) and **72.1-F9** (P3 — terse "Invalid hero data" copy). NOT in scope: 72.10 / 72.11 / 72.13 / 72.14 (implemented separately) and all frozen surfaces (billing, plans, quota, preview security, Partner billing, commission, Theme Experience, storefront rendering, Prisma schema).

---

## 1. Executive Verdict

**VERDICT: A — VERIFIED.**

A creator can now save their Hero identity with or without a profile picture, and can clear the picture (or any hero field) — the actions that previously always failed with `"Invalid hero data"` — verified end-to-end from the Settings form through the server action, the JSONB delete-key persistence contract, the reload, and the live preview. 29 focused unit tests pass; the full suite is green except 7 pre-existing RCCF-71.x theme-experience guardrail failures that are a frozen, out-of-scope surface (documented in §8).

The write contract is explicit and symmetric at the action boundary:

- **field OMITTED (undefined)** → leave unchanged (sparse patch).
- **field = null** → explicit CLEAR → JSON `null` → JSONB key removed.
- **field = "" (empty string)** → normalized to JSON `null` → same CLEAR result.

Server action errors are sanitized: known product sentences pass through, raw Prisma/DB/provider internals collapse to a safe generic message, and validation failures return structured `fieldErrors` with creator-friendly copy (no more "Invalid hero data").

---

## 2. Root cause

The server schema encoded "field absent" as the only valid "leave unchanged / empty" signal (`z.string().optional()` accepts `undefined` only). The form, by contrast, expresses "no picture / cleared picture" as an explicit `null`. The two models disagreed, so the legitimate client payload (`null`) failed Zod validation before the sparse-patch merge ever ran — and the failure surface leaked an internal zod phrase as the user-facing error.

Reproduction (confirmed): with no profile picture, `handleSaveIdentity` sends `profilePictureUrl: null` / `profilePictureAssetId: null`; `heroPartialSchema` rejected it → `{"success":false,"error":"Invalid hero data"}`. A creator without a profile picture could never save their hero identity.

Secondary gap: on any non-validation error the action returned the raw `Error.message` (which can be a Prisma/SQL/provider string) straight to the UI.

---

## 3. Canonical write contract (now enforced)

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

Persistence contract (unchanged, read-only): `SettingsService.patchHeroData` uses `kv."v" = 'null'::jsonb` to delete a key — JSON `null` is the canonical "clear". The action layer now feeds it correctly instead of dropping it.

| Value sent by client | Meaning | Server action | JSONB result |
|---|---|---|---|
| field omitted (`undefined`) | leave unchanged | skipped (`continue`) | key untouched |
| `null` | explicit clear | passed as `null` | key REMOVED |
| `""` (empty string) | cleared FormData | normalized to `null` | key REMOVED |
| `"text"` / URL / assetId | set | passed as-is | key SET |

Renderer parity: absent profile picture → no avatar; empty `profilePictureUrl` → no avatar (renderers treat `""` as absent) — verified in unit tests and in-browser.

---

## 4. Implementation

### `src/actions/settings.actions.ts`
1. **`heroPartialSchema`** — all 18 string fields changed `z.string().optional()` → `z.string().nullable().optional()`.
2. **Sparse-loop rewrite** in both `updateHeroData` and `updateHeroPartial`:
   - OLD: `if (value !== undefined && value !== null)` — dropped explicit `null` (so clears were impossible) and required non-null.
   - NEW: `if (value === undefined) continue; sparseData[key] = value === "" ? null : value;` — only omission means "leave unchanged"; `""` and `null` both become JSON `null` (clear).
3. **Validation failures** now return `{ success: false, error: HERO_SAVE_VALIDATION_ERROR, fieldErrors }` where `HERO_SAVE_VALIDATION_ERROR = "Unable to save your hero settings. Please review your changes and try again."` — no more "Invalid hero data".
4. **`safeHeroSaveError(error)`** — conservative classifier (same rule as `publish-error-messages.ts`): known technical hints (prisma/sql/database/postgres/connection/timeout/ECONN*/constraint/provider/stack traces/etc.) collapse to `HERO_SAVE_GENERIC_ERROR = "Unable to save your hero settings. Please try again."`; product-readable sentences pass through. Catch blocks use it; the auth guard's `"Unauthorized"`/`"Forbidden"` pass-through is preserved.

### `src/features/settings/components/settings-form.tsx`
- Identity clear flow unchanged (`profilePictureUrl: (overrides?.profilePictureUrl ?? profilePictureUrl) || null`) — now supported server-side. The `|| null` is the canonical CLEAR payload; the server schema now accepts null so a cleared picture persists.
- Added `backgroundSave` pending/error/success state to surface background clear errors (background half of F1) instead of swallowing them.

### No other production files changed.
`settings.service.ts`, `website-aggregate.service.ts`, `build-snapshot.ts`, `renderers.tsx` are read-only dependencies verified intact — not modified. `settings-live-preview.tsx` carries pre-existing RCCF-71.3 changes and was not touched by this ticket.

---

## 5. Files changed (this ticket)

| File | Change |
|---|---|
| `src/actions/settings.actions.ts` | nullable schema; sparse-loop semantics; structured + sanitized errors |
| `src/features/settings/components/settings-form.tsx` | backgroundSave error surfacing; canonical `|| null` clear payload |
| `tests/unit/rccf72-12-hero-settings-write-fix.test.tsx` | new — 29 tests (behavioral + source guardrails) |

**Diff discipline note:** the working tree carries many uncommitted changes from prior RCCF tickets (59 modified files + untracked docs/screenshots/tests). This ticket touched only the 2 production files above plus its new test file. `git diff` scope was verified: no frozen surface (billing, plans, quota, preview security, Partner billing, commission, Theme Experience, storefront rendering, Prisma schema) was modified.

---

## 6. Tests

`tests/unit/rccf72-12-hero-settings-write-fix.test.tsx` — **29/29 PASS** (baseline was 24; 5 cases added this ticket).

Behavioral cases:
- Save identity with picture present → picture URL + assetId preserved.
- Save identity with no picture (omitted field) → field not sent → unchanged.
- Save identity with `profilePictureUrl: null` → succeeds; JSONB key removed (clear).
- Save identity with `profilePictureUrl: undefined` → field not sent → unchanged.
- `""` normalized to `null` → clear path.
- Invalid profile picture (`profilePictureUrl: 12345`) → structured validation error (`HERO_SAVE_VALIDATION_ERROR`), no write, no raw zod string.
- Wrong tenant (CREATOR session, mismatched `tenantId`) → `Forbidden`, no write.
- SUPER_ADMIN on another tenant → succeeds (bypass).
- Title/subtitle save without picture; sparse preservation (untouched keys unchanged); empty partial no-op; DB-error sanitization → generic message; product-error pass-through; `Unauthorized` pass-through; FormData path; renderer avatar on/off.

Source guardrails: nullable schema present; `if (value === undefined) continue` in both actions; no stale `value !== null` guard; clear expression present; `backgroundSave` present; `'null'::jsonb` persistence contract present.

---

## 7. Verification gate

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | PASS (exit 0) |
| Focused suite (`rccf72-12-hero-settings-write-fix.test.tsx`) | 29/29 PASS |
| Related suites (`rccf70-4-5-builder`, `rccf67-storefront-integrity`) | 69/69 PASS |
| `npm run build` | PASS (exit 0) |
| `npx eslint` on touched files | 0 errors (1 pre-existing warning: `setHeroSubtitle` unused — not introduced here) |
| `git diff --check` | PASS (exit 0; only pre-existing CRLF warnings) |
| Full `npx vitest run` | 3667 passed, 7 failed — all 7 are pre-existing RCCF-71.x theme-experience guardrails (see §8) |

---

## 8. Regression verification

- **Pre-existing failures (out of scope, frozen surface):** 7 failures, all RCCF-71.x source-guardrails asserting `themeConfig` / `applyExperienceOverride` threading inside `src/lib/storefront/storefront-loader.ts` (`rccf71-1`, `rccf71-2` ×2, `rccf71-3` line 310, `rccf71-5-1`, `rccf71-6-1`, `rccf71-6-2` line 123). This loader is a frozen Theme Experience / storefront-rendering surface explicitly out of 72.12 scope; it is byte-identical to HEAD (verified 0 diff lines) and the failures stem from an earlier working-tree state unrelated to this ticket. Not fixed here; documented as a pre-existing, deferred condition.
- **72.12 change caused zero failures:** no settings/hero-action test regressed; the only failing suites are the 71.x loader guardrails above.
- **Frozen surfaces verified unchanged in diff scope:** Prisma schema, billing, plans, capabilities, auth, lifecycle, publishing, Theme Experience, Hero ownership (remains Settings/`hero_data`), Builder architecture, storefront, navigation.
- **Security:** `requireAuth` unchanged — no session → `Unauthorized`; non-owner CREATOR → `Forbidden`; SUPER_ADMIN bypass preserved. Verified by unit tests (wrong-tenant Forbidden, SUPER_ADMIN success) and by the live 200 OK on the owner session during browser QA.

---

## 9. Browser QA (Playwright MCP, dev server :3000)

QA account: Growth (`rccf7151-growth@example.com` / `Audit72!QaPass`), provisioned with the canonical `hero_data` fixture from `scripts/recovery-seed.ts`.

| Scenario | Result |
|---|---|
| A. Save Identity with NO profile picture (`profilePictureUrl: null`) | **PASS** — request body contained `profilePictureUrl: null`; POST 200 with `x-action-revalidated`; UI showed "Identity saved!" |
| B. Save Identity with an existing picture (uploaded 1×1 PNG) | **PASS** — request body contained the uploaded URL + assetId (picture preserved, not nulled); POST 200; "Identity saved!" |
| C. Remove picture → Save Identity | **PASS** — asset cleanup POST 200; after fresh reload the Profile Picture field shows "No media selected yet" and the live preview shows no avatar (clear persisted) |
| D. Reload after save | **PASS** — persisted state renders on fresh server render |
| E. Horizontal overflow | **PASS** — `documentElement.scrollWidth === clientWidth` (1280), no horizontal overflow on the Settings page |

Console: 0 errors; warnings are benign Next dev-mode `layout.css` preload notices. The Growth fixture was restored to its original "no picture" state after QA (the uploaded test PNG was removed via the Remove flow).

---

## 10. Final verdict

**A — VERIFIED.**

The previously un-saveable "Save Identity" flow (72.1-F1, P1) and the terse-error defect (72.1-F9, P3) are closed, plus the background-clear variant. Every state in the canonical contract (omitted / null / empty / set) is proven by 29 unit tests and by browser QA from form → server action → JSONB persistence → reload → live preview. No frozen surface was touched; the full suite is green except 7 pre-existing RCCF-71.x theme-experience guardrail failures on a frozen storefront-loader surface that predate this ticket.

```
RCCF-72.12 STATUS:   COMPLETE (A — VERIFIED). No commit.
FILES:               settings.actions.ts, settings-form.tsx,
                     tests/unit/rccf72-12-hero-settings-write-fix.test.tsx (new),
                     docs/rccf-72.12-save-identity-closure.md (new).
ROOT CAUSE:          z.string().optional() rejected explicit null from the form
                     ("no picture" / "cleared picture") → "Invalid hero data".
FIX:                 all string hero fields nullable().optional(); sparse loop
                     omits only undefined and normalizes "" → null (JSONB
                     delete-key clear); structured fieldErrors; sanitized
                     technical errors; backgroundSave surfaced in the form.
TESTS:               29 focused pass; related suites 69/69; tsc/build/eslint/diff
                     clean; full suite green except 7 pre-existing RCCF-71.x
                     frozen-loader guardrails (out of scope, deferred).
BROWSER QA:          no-picture save PASS; picture-preserve save PASS; remove→
                     persist PASS; reload PASS; no horizontal overflow PASS.
VERDICT:             A — VERIFIED.
```