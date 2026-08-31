# RCCF-70.4.6.1 - Builder Minor Visual Polish

## 1. Executive Verdict

**A - staged, not committed.** This ticket makes presentation-only changes for
the verified mobile sheet and Builder chrome findings. Frozen Builder state,
persistence, rendering, publishing, Hero ownership, tenant/auth, capability,
billing, and database surfaces were not changed.

## 2. Findings Classification

| Luna finding | Classification | Basis |
| --- | --- | --- |
| Mobile Sections sheet clips/reaches the bottom edge at 320/375/390 | **CONFIRMED + FIXED** | The sheet used a fixed `80vh` cap and did not reserve safe-area space. It now uses dynamic viewport sizing, an explicit scroll region, and safe-area bottom padding. |
| Screenshots show `Loading live preview...` | **QA CAPTURE ARTIFACT** | The text is rendered only while the single `getLivePreviewData()` request is unresolved. The request completion path sets `dataReady` true even on failure, so this is not a persistent loading state. The authenticated timing probe could not complete because the documented credentials were rejected; no preview architecture was rewritten. |
| Desktop canvas feels flat/empty compared with Stitch | **CONFIRMED + FIXED** | The Builder canvas and device frame shared nearly identical dark surfaces and had weak frame separation. Existing zinc/white tokens now provide restrained outer-surface contrast, frame border, and ring hierarchy without fabricated content. |
| Rail metadata/secondary controls are dense/low contrast | **CONFIRMED + FIXED** | Secondary section metadata/actions and Website/Theme/Progress labels were raised one subtle contrast step within the existing rail widths. |

## 3. Implementation Changes

| File | Change |
| --- | --- |
| `src/features/builder/components/mobile-panel.tsx` | Dynamic viewport sheet/body limits, scroll containment, safe-area bottom padding. |
| `src/features/builder/canvas/interactive-canvas.tsx` | Presentation-only canvas background and device-frame separation. |
| `src/features/builder/components/section-manager.tsx` | Subtle contrast improvement for metadata, status, and secondary actions. |
| `src/features/builder/components/website-panel.tsx` | Subtle contrast improvement for secondary group labels. |
| `tests/unit/rccf70-4-6-1-builder-minor-polish.test.tsx` | Guardrails for sheet reachability, canvas-only polish, contrast, and frozen inspector width. |

## 4. Architecture Preservation

Untouched: Builder store/state, `saveBuilderPages`, persistence, LayoutEngine,
ComponentRegistry, renderers, Hero/Settings authority, `publishWebsite()`,
publishing UX, tenant/auth/capability/billing, server actions/API queries,
Prisma schema/migrations, and the frozen approximately 260px inspector.

No content, fake data, unsupported Stitch controls, new state, or new data path
was introduced.

## 5. Verification Results

| Gate | Result |
| --- | --- |
| Focused Builder/RCCF tests | PASS - 4 files, 70 tests |
| `npx eslint` on touched files | PASS - 0 errors; one pre-existing `LayoutSnapshot` warning |
| `git diff --check` | PASS; only pre-existing CRLF warnings in unrelated files |
| Browser visual recheck | PARTIAL - dev server was started on port 3001; port 3000 was a stale/mismatched instance. The documented creator credentials were rejected, so authenticated `/builder` sheet screenshots could not be safely captured. |
| `npx tsc --noEmit` | PASS |
| `npx vitest run` | PARTIAL on first full run - 218 files / 3304 tests passed; one unrelated pre-existing `rccf68-retry-catalog-timeout.test.ts` test timed out at 5 seconds. Immediate focused rerun passed 11/11. |
| `npm run build` | PASS - optimized production build completed; pre-existing warnings only. |
| `npx prisma validate` | PASS |
| `npx prisma generate` | PASS |

## 6. Diff Discipline

Only the four Builder presentation files and one focused guardrail test are in
scope. Pre-existing dirty worktree files and prior RCCF reports/tests were left
untouched. No commit was created.

## 7. Risks and Edge Cases

- The sheet now uses `dvh`, with the existing `vh` behavior removed, so browser
  chrome changes cannot reduce the reachable content area unexpectedly.
- Safe-area padding is additive and does not hide or remove Add Section options.
- The preview loading label remains intentionally present during an active
  request; changing it would risk masking a real slow backend request.
- Full authenticated visual evidence remains limited by unavailable/rejected
  local test credentials, not by a code failure in the changed presentation.

## 8. Recommendation

Proceed after the verification gate is green and a valid authenticated browser
session is available for the requested 320/375/390 and desktop screenshot pass.

RCCF-70.4.6.1 is complete. Verdict: A.
