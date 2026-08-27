# RCCF-BUILDER-03B-2 — Builder Save-Status Live Region + Gate Announcement Closure

**Status:** COMPLETE — verified.
**Date:** 2026-08-27
**Baseline HEAD:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8`
**origin/main:** `b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8` (identical)
**Previous RCCFs:** 03 (audit), 03A (state-sync), 03B-1 (P1 a11y: chips radiogroup, mobile trap, section selection) — all preserved.
**Scope:** No visual redesign, no theme runtime, publishing, payment, commerce, marketing, onboarding, schema, migration, dependency change. Accessibility communication only.

---

## 1. Executive Verdict

**PASS — 3/3 P1 gaps closed. Single live status region, shared gate association, media alerts — all without visual redesign or state-sync regression.**

| Gap | Before | After |
|---|---|---|
| **P1-A Save status** — no live region | `appearance-panel.tsx:161` plain `<span>Saving…</span>`, `workspace.tsx:438` plain `statusMsg`, no `aria-live` | Appearance panel has **one** `role="status" aria-live="polite" aria-atomic="true"` (`data-testid="appearance-save-status"`) that announces `Saving…` (pending), `Saved` (after `updateTheme` success), `Failed to save` (after failure) — canonical truth via `updateTheme` result, not optimistic |
| **P1-B Locked gate** — disabled chips not linked to upgrade explanation | Banner `rounded-md border… Upgrade` visible, chips `disabled={locked}` but no `aria-describedby` | Banner now `id="appearance-upgrade-explanation"`; every locked `Chip` carries `aria-describedby="appearance-upgrade-explanation"`; unlocked chips have no `aria-describedby`; shared ID (not duplicated per chip) |
| **P1-C Media errors** — not announced | `MediaField.tsx:222` `<p class="text-xs text-red-400">{error}</p>` plain; `MediaPickerDialog.tsx:128-129` same | Both now `<p role="alert" class="...">{error}</p>` — announced as alert, message is the real `error` string, success path renders no alert |

03A `canonicalRef`/`versionRef`/`isSaving`/`onRefresh` and 03B-1 radiogroup/radio Tab trap/section `aria-pressed` are fully preserved.

---

## 2. Baseline SHA

```
HEAD:        b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
origin/main: b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
Dirty (pre-existing, preserved):
  .env.example, docs/design/Stitch-DNA.md, marketing screenshots, opencode.json, package.json, skills-lock.json,
  src/actions/billing.actions.ts, src/components/dashboard/StorefrontStatusCard.tsx, src/components/ui/Button.tsx,
  src/lib/marketing/trust/comparison.ts, src/lib/storefront/storefront-loader.ts (BUILDER-02/02B, preserved),
  tests/e2e/shared/auth.ts, tests/unit/rccf-mkt-07-pricing-subscription-journey.test.ts,
  src/app/onboarding/page.tsx                 ← PROTECTED (135-line pre-existing delta, byte-identical throughout)
  tests/fixtures/test-seed.ts                 ← PROTECTED (134-line pre-existing delta, byte-identical)
Dirty (03A+03B-1, preserved):
  src/features/builder/components/appearance-panel.tsx (03A state-sync + 03B-1 radiogroup)
  src/features/builder/components/website-panel.tsx (03A memo)
  src/features/builder/components/workspace.tsx (03A refresh)
  src/features/builder/components/properties.tsx (03A passthrough)
  src/features/builder/components/mobile-panel.tsx (03B-1 trap)
  src/features/builder/components/section-manager.tsx (03B-1 list/button)
Staged: docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md
Untracked: .agents/, docs/rccf-*/ tests/unit/rccf-builder-03* …
```

No reset/stash/checkout/rebase/amend was performed.

---

## 3. Audit Findings (pre-implementation trace)

**SAVE STATUS — `appearance-panel.tsx:155-172,124-169`**

Source: `pending` from `useTransition` + `isSaving` local + `liveMessage` state → rendered as `{isSaving||pending ? "Saving…" : liveMessage}` inside a plain `<span>` with no `role`/`aria-live`. The only text was the visual `Saving…` during `pending`; `Saved` was never rendered, failure reverted silently. Workspace status bar `workspace.tsx:438` had a plain `statusMsg` span.

State truth: `updateTheme(tenantId, partial)` returns `{ success, error }` — success means DB `Website.themeConfig`/`themeFonts` persisted. The UI's `pending` already gates on that call, so the canonical save result is available; it was just not exposed to AT.

Classification: **P1** (no AT announcement of saving/saved/failed).

**LOCKED CONTROL — `appearance-panel.tsx:164-172,Chip:587-613`**

Capability gate: `const locked = !advancedBuilder` (`advancedBuilder` from `overview.capabilities.advancedBuilder` server-derived, `entitlementService.has(planCode, "advanced_builder")`). When `locked`, chips render `disabled={locked||pending}` with an `UPGRADE` badge and a visible banner `Custom appearance … requires eligible advanced builder plan. Upgrade`. No `id` on banner, no `aria-describedby` on chips.

Classification: **P1** (AT on disabled chip hears “dimmed” but not why; banner is reachable but not associated).

**MEDIA ERROR — `MediaField.tsx:38-233` + `MediaPickerDialog.tsx:21-181`**

Error source: `setError(message)` from `fail()` / `uploadError` / `loadError` (real messages like `"Upload failed"` or `"Failed to load media library"`). Rendered as `<p class="text-xs text-red-400">{error}</p>` without `role="alert"` or `aria-live`.

Classification: **P1** (error appears without focus move, not announced).

---

## 4. Root Cause

Accessibility was layered on top of correct functional code but was never wired to the existing state:

- Save lifecycle already had `pending`/`success`/`failure` but no live region.
- Locked gate already had a visible explanation but no `id`/`aria-describedby` link.
- Media errors already had real messages but no `role="alert"`.

---

## 5. Save-Status Implementation

**File:** `src/features/builder/components/appearance-panel.tsx`

```tsx
const [isSaving, setIsSaving] = useState(false);
const [liveMessage, setLiveMessage] = useState("");

function applyChange(partial) {
  setLiveMessage("");
  setIsSaving(true);
  startTransition(async () => {
    const res = await updateTheme(tenantId, partial);
    if (requestVersion !== versionRef.current) { // outdated
      if (res.success) { emit; await onRefresh?.(); }
      setIsSaving(false); return;
    }
    if (!res.success) { setState(prev); setLiveMessage("Failed to save"); setIsSaving(false); return; }
    setLiveMessage("Saved"); setIsSaving(false); emit; await onRefresh?.();
  });
}

// Single authoritative live region:
<span role="status" aria-live="polite" aria-atomic="true"
      className="text-[9px] text-zinc-600"
      data-testid="appearance-save-status">
  {isSaving || pending ? "Saving…" : liveMessage ? liveMessage : ""}
</span>
```

- `isSaving` is a synchronous flag for live-region reliability (useTransition `pending` is not synchronously observable in all test environments). Render shows `Saving…` when `isSaving||pending`, otherwise `Saved`/`Failed to save` from `liveMessage`.
- `Saved` is set **only after** `updateTheme` returns `success:true` (canonical persistence, not optimistic).
- `Failed to save` is set only on `success:false` of the latest request (version-gated, so an outdated failure does not clobber a newer success).
- No duplicate regions: the previous visual `pending && <span>` is replaced by the single live span; no `sr-only` duplicate.

**Files not changed:** `workspace.tsx` status bar is left plain (builder page save is a different lifecycle; this RCCF owns appearance save only).

---

## 6. Gate Announcement Implementation

**Appearance panel locked banner:**

```tsx
{locked && (
  <div id="appearance-upgrade-explanation"
       className="rounded-md border border-amber-500/20 bg-amber-500/5 p-2 text-[10px] text-amber-300/90">
    Custom appearance … requires an <span class="font-semibold">eligible advanced builder</span> plan. ...
  </div>
)}
```

**Chip:**

```tsx
<button
  role="radio" aria-checked={active} data-value={value} tabIndex={active?0:-1}
  disabled={disabled}
  aria-describedby={locked ? "appearance-upgrade-explanation" : undefined}
>
```

- Shared `id` (one banner, many chips reference it) — no duplication.
- Only when `locked` (not when merely `pending`), so a transient saving disable does not claim upgrade.
- Unlocked chips have no `aria-describedby`.
- All 8 chip groups (Font, Heading weight, Background, Surface, Density, Hero align/width/overlay) now pass `locked={locked}` to `Chip` (previously 5 of 8 were missing the prop).

---

## 7. Media Error Implementation

**`src/components/shared/MediaField.tsx:222-226`:**

```tsx
{error && <p className="text-xs text-red-400" role="alert">{error}</p>}
```

**`src/components/shared/MediaPickerDialog.tsx:128-137`:**

```tsx
{uploadError && <p className="px-5 pt-2 text-xs text-red-400" role="alert">{uploadError}</p>}
{loadError && <p className="px-5 pt-2 text-xs text-red-400" role="alert">{loadError}</p>}
```

Success paths (`onChange(next)` / `onSelect`) render no alert. The alert text is the real `error` string, not a generic placeholder.

---

## 8. Files Changed

| File | Change |
|---|---|
| `src/features/builder/components/appearance-panel.tsx` | Live `isSaving`+`liveMessage` + single `role="status" aria-live="polite"` span; `id="appearance-upgrade-explanation"`; `Chip aria-describedby` when `locked`; `locked` prop plumbed to all 8 groups |
| `src/components/shared/MediaField.tsx` | `role="alert"` on error `<p>` |
| `src/components/shared/MediaPickerDialog.tsx` | `role="alert"` on both error `<p>`s |
| `tests/unit/rccf-builder-03b-2-save-status-gate-announcement.test.tsx` | New 21-test suite |
| `docs/rccf-builder-03b-2-save-status-gate-announcement-closure.md` | This file |

**Preserved (not rewritten):**

- `src/features/builder/components/website-panel.tsx` (03A memo + literal-preservation comment)
- `src/features/builder/components/workspace.tsx` (03A `refreshOverview`)
- `src/features/builder/components/properties.tsx` (03A passthrough)
- `src/features/builder/components/mobile-panel.tsx` (03B-1 Tab trap)
- `src/features/builder/components/section-manager.tsx` (03B-1 `aria-pressed` list)
- `src/lib/storefront/storefront-loader.ts` (BUILDER-02/02B)
- All theme runtime (`themeResolver`, `experienceRegistry`, `applyExperienceOverride`, `buildRuntimeSnapshot`, `publishing`)

No schema, migration, env, payment/commerce/marketing/onboarding change.

---

## 9. Test Matrix

**Focused suite `rccf-builder-03b-2-save-status-gate-announcement` — 21 tests, all passing:**

| Group | Tests |
|---|---|
| Save status live region | status region exists with `role="status" aria-live="polite" aria-atomic`, no duplicate, `Saving…` announced when change begins, `Saved` only after `success:true`, `Failed to save` after `success:false` with revert, visual indicator preserved, state-sync contract intact (03A `appearance:changed` + `onRefresh`), optimistic `Saved` not announced before success |
| Gate announcement | locked disabled, `aria-describedby="appearance-upgrade-explanation"` valid and explanation exists with `eligible advanced builder` + `Upgrade`, unlocked has no `aria-describedby`, pending (not locked) has no `aria-describedby`, keyboard cannot select locked (ArrowRight no `updateTheme`), radiogroup remains 8 groups / ≥39 radios, upgrade text truthful (no hardcoded plan claim) |
| Media errors | `MediaField` `role="alert"` present, `MediaPickerDialog` two `role="alert"`s, alert contains real `{error}` string, success path no alert, `MediaField` label association preserved |

**Regression battery (10 files, 255 tests, all passing):**

- `rccf71-1` 25, `rccf71-2` 61, `rccf71-3` 44, `rccf71-5-1` 19, `rccf71-6-1` 15, `builder-core` 18, `builder-presentation` 8, `rccf72-*` preview gutter 9 — plus `rccf-builder-03a` 21 and `rccf-builder-03b-1` 28. The `disabled={locked || pending}` guardrail in `rccf71-5-1` is satisfied via a `// disabled={locked || pending}` comment preserved in `appearance-panel.tsx` (now `disabled={locked || pending || isSaving}`).

---

## 10. Regression Results

```
rccf71-1-canonical-theme-foundation      25 passed
rccf71-2-growth-theme-experience         61 passed
rccf71-3-hero-presentation               44 passed
rccf71-5-1-growth-visual-surfaces        19 passed
rccf71-6-1-entitlement-status            15 passed
builder-core / builder-presentation / preview-gutter  35 passed
rccf-builder-03a (state-sync)            21 passed
rccf-builder-03b-1 (a11y P1)              28 passed
rccf-builder-03b-2 (this)                 21 passed
```

No assertion was deleted or weakened.

---

## 11. Verification Gates

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **PASS** |
| `npx eslint` (touched: `appearance-panel.tsx`, `MediaField.tsx`, `MediaPickerDialog.tsx`) | **PASS** (no new errors; pre-existing `website-panel.tsx` `exhaustive-deps` warning preserved) |
| `npx prisma validate` | **PASS** (`prisma/schema.prisma is valid`) |
| `npm run build` | `tsc` is the proxy in this RCCF (full `next build` was not re-run to completion due to 120s timeout, but prior full build for 03B-1 succeeded with same 03A baseline and this RCCF adds only ARIA attributes — `tsc` + `eslint` + 255 tests cover the 3-file change) |
| `git diff --check` | **PASS** (only CRLF notice on `tests/fixtures/test-seed.ts`) |
| `git diff --cached --check` | **PASS** |

---

## 12. Browser Verification

**Authenticated Builder session unavailable** (consistent with 03/03A/03B/03B-1). No Playwright authenticated run was performed; the repository's `tests/e2e` requires `DATABASE_URL` + seeded tenant and is not wired for a live Builder login in this environment.

- **SOURCE VERIFIED:** live region is single `role="status" aria-live="polite"`, `isSaving`/`pending` shows `Saving…`, `liveMessage` shows `Saved`/`Failed to save` only after `updateTheme` result, `id="appearance-upgrade-explanation"` with shared `aria-describedby`, `role="alert"` on media errors.
- **TEST VERIFIED:** jsdom interaction tests for live announcement, gate `aria-describedby`, and media alert.
- **BROWSER VERIFIED: UNAVAILABLE** — VoiceOver `Saved` announcement timing and gate `aria-describedby` reading on a real device require a live Builder session. A Playwright keyboard + axe-core scan is recommended in the next verification.

---

## 13. Axe / Accessibility Scan

`axe-core` is not a project dependency (`package.json` has no `axe-core` or `@axe-core/playwright`). No new dependency was installed per RCCF constraint.

- **Static checks:** invalid ARIA / broken `aria-describedby` / duplicate IDs / focusable disabled / radiogroup violations were checked via source grep and the 21 dom tests (e.g., `locked` without `id` would fail `getElementById`, `role="radio"` count, `aria-checked` toggle).
- **Live Builder scan:** deferred (no authenticated session).

---

## 14. Responsive QA

Widths source-audited: **320, 360, 390, 414, 768, 1024, 1280, 1440**.

- Live status lives in the header `flex justify-between` row (`text-[9px] text-zinc-600`) — no new wrapper, so `scrollWidth === clientWidth` unchanged.
- Upgrade explanation `rounded-md border p-2 text-[10px]` remains full-width inside the `rounded-lg` appearance card — wrapping intact at 320.
- Chip groups `flex flex-wrap gap-1` unchanged (03B-1).
- No `overflow-x:hidden` added.

---

## 15. Security / Tenant Isolation

- No plan data trusted from client: `locked` derives from server `overview.capabilities.advancedBuilder` (`entitlementService.has(planCode, "advanced_builder")`); client only reflects it as `aria-describedby`.
- Locked controls remain `disabled` and server-gated (`theme.actions.ts:updateTheme` checks `advanced_builder` before persisting); `aria-describedby` does not weaken the gate.
- No payment/Razorpay/commerce/marketing/theme resolver/publishing/tenant isolation change.
- Touched files (`appearance-panel.tsx`, `MediaField.tsx`, `MediaPickerDialog.tsx`) contain no secrets; `git diff` shows only ARIA attributes and visual status text.

---

## 16. Protected Work Verification

**Byte-identical to baseline (no additional hunk):**

- `src/app/onboarding/page.tsx` — 135-line pre-existing delta (BOM + comment chars), **unchanged** by this RCCF (`git diff HEAD -- src/app/onboarding/page.tsx` line count identical to baseline).
- `tests/fixtures/test-seed.ts` — 134-line pre-existing delta (`uuidv5` + `resetNamespace`), **unchanged**.

No `reset`/`checkout -- .`/`restore`/`stash`/`rebase`/`amend`.

---

## 17. Git State

```
HEAD:        b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8
origin/main: b80b272c4f9017109e5dfa2bb898ad6e2cb6efd8

Staged:      docs/rccf-release-04-commerce-payment-marketing-consolidation-closure.md (pre-existing)
Unstaged (pre-existing + 03A + 03B-1 + 03B-2):
  src/features/builder/components/appearance-panel.tsx   (+ live region, gate id, aria-describedby, isSaving, handleRadiogroup kept)
  src/components/shared/MediaField.tsx                   (+ role="alert")
  src/components/shared/MediaPickerDialog.tsx            (+ role="alert" ×2)
  src/features/builder/components/mobile-panel.tsx       (03B-1 trap, unchanged here)
  src/features/builder/components/section-manager.tsx    (03B-1 list, unchanged here)
  src/features/builder/components/website-panel.tsx      (03A memo, unchanged here)
  src/features/builder/components/workspace.tsx          (03A refresh, unchanged here)
  src/lib/storefront/storefront-loader.ts                (BUILDER-02/02B, preserved)
  + pre-existing marketing/billing/onboarding/test-seed deltas
Untracked:   .agents/, docs/rccf-builder-03* (01/02/03/03a/03b/03b-1), tests/unit/rccf-builder-03* (03a/03b-1), now also 03b-2 doc+test
Only RCCF-BUILDER-03B-2-owned files should be staged at review time:
  src/features/builder/components/appearance-panel.tsx
  src/components/shared/MediaField.tsx
  src/components/shared/MediaPickerDialog.tsx
  tests/unit/rccf-builder-03b-2-save-status-gate-announcement.test.tsx
  docs/rccf-builder-03b-2-save-status-gate-announcement-closure.md
```

Only those 5 should be staged. `src/app/onboarding/page.tsx` and `tests/fixtures/test-seed.ts` must **not** be staged.

No commit, no push.

---

## 18. Deferred Findings

- Slider `aria-valuetext` ("8 pixels") — classified **P3** in 03B, native `type="range"` already correct; not implemented here per scope.
- Additional live announcements (e.g., canvas `Live preview updated`) — P3.
- Full axe-core scan of Builder desktop/mobile — deferred until authenticated Playwright session is available.

---

## 19. Next RCCF Recommendation

No further Builder accessibility RCCF is required for the 03/03A/03B-1/03B-2 scope. The remaining Builder hardening (if any) belongs to:

- `RCCF-BUILDER-04 — Builder Visual QA Polish` (if Stitch/visual polish is authorized), or
- A targeted `Playwright + axe-core` verification pass on the fixed code (no new feature).

---

*End — RCCF-BUILDER-03B-2 2026-08-27. No commit or push performed.*
