# RCCF-70.4.6.1 - Authenticated Final Visual Verification

## 1. Account and Access

- Provisioning: **PASS** through the normal `/signup` flow.
- Persona/plan: Creator, default Creator Launch/free path.
- Onboarding: **PASS** through the existing `Build Manually` path. This
  provisioned the tenant and website without publishing.
- QA account used for captured evidence:
  `rccf70461qa1786912185755@example.com`
- Builder access: **PASS**. `/builder` loaded with the authenticated signup
  session, valid tenant-backed Builder state, Sections rail, canvas, and
  Properties rail.
- Publishing: **NOT PERFORMED**.
- Existing users/data: not modified.

## 2. Normal Login Check

After provisioning, a separate fresh browser context attempted normal login
with the new account. The application returned to `/admin/login` without a
session. This was reproduced with the freshly provisioned QA accounts and is
not caused by the Builder presentation changes. The successful signup session
was retained for the requested visual verification so no auth bypass or source
change was introduced.

This is a **new P1 verification blocker for the normal-login requirement**,
outside RCCF-70.4.6.1's frozen Builder presentation scope. It should be tracked
separately in authentication/session provisioning. No Builder P0/P1/P2/P3
visual defect was found.

## 3. Preview Settling

| Elapsed | Result |
| --- | --- |
| 1s | Builder shell still initializing; no canvas test id yet |
| 3s | Canvas mounted; `Loading live preview...` present |
| 5s | Canvas mounted; loading still present |
| 10s | Canvas mounted; loading settled in the final run |
| 20s | Canvas mounted; loading absent |

The preview is **not permanently stuck**. It settled by 10 seconds in the
final authenticated run and was definitely settled by 20 seconds. The earlier
`Loading live preview...` screenshots were capture timing artifacts, although
the request latency is worth monitoring separately.

## 4. Screenshots

All paths are relative to the repository root:

- `screenshots/rccf-70.4.6.1-authenticated-320-canvas.png`
- `screenshots/rccf-70.4.6.1-authenticated-320-sections-top.png`
- `screenshots/rccf-70.4.6.1-authenticated-320-sections-bottom.png`
- `screenshots/rccf-70.4.6.1-authenticated-375-canvas.png`
- `screenshots/rccf-70.4.6.1-authenticated-375-sections-top.png`
- `screenshots/rccf-70.4.6.1-authenticated-375-sections-bottom.png`
- `screenshots/rccf-70.4.6.1-authenticated-390-canvas.png`
- `screenshots/rccf-70.4.6.1-authenticated-390-sections-top.png`
- `screenshots/rccf-70.4.6.1-authenticated-390-sections-bottom.png`
- `screenshots/rccf-70.4.6.1-authenticated-desktop-1440.png`
- `screenshots/rccf-70.4.6.1-authenticated-properties-390.png`

## 5. Visual Results

| Viewport | Result |
| --- | --- |
| 320px | Sections sheet fully reaches the final Footer Add Section row without clipping. The sheet content did not require scrolling in this fresh account; final row was visible. |
| 375px | Same result. No bottom-edge clipping; all catalog options visible. |
| 390px | Same result. Properties sheet also opened and rendered its Theme/Progress content. |
| 1440px | Canvas/device frame has visible surface, border, and ring separation. Left and right rail metadata/actions are readable without widening the frozen inspector. |

Programmatic sheet metrics at all mobile widths: `scrollHeight=599`,
`clientHeight=599`, final Footer option visible. The safe-area padding computed
to `0px` in the desktop browser emulation, as expected for a non-notched
headless context; the safe-area CSS is present for real devices.

## 6. RCCF Findings Resolution

| Finding | Final status |
| --- | --- |
| Mobile Sections sheet clips/reaches bottom edge | **CONFIRMED + FIXED**. Authenticated screenshots show the complete Add Section catalog, including Footer, at 320/375/390. |
| `Loading live preview...` appears | **QA CAPTURE ARTIFACT**. Authenticated timing confirms eventual settlement, by 10 seconds in the final run and by 20 seconds in all observed checks. |
| Desktop canvas feels flat/empty | **CONFIRMED + FIXED**. Authenticated desktop screenshot shows clear canvas/frame hierarchy without fabricated content. |
| Rail metadata/secondary controls too dense/low contrast | **CONFIRMED + FIXED**. Authenticated desktop and mobile Sections screenshots show readable metadata and controls within existing widths. |

## 7. New Findings

- **P1, auth/session verification blocker:** fresh provisioned Creator users
  could complete signup and onboarding but separate normal login returned to
  `/admin/login` without a session. This was not changed here because the
  request freezes authentication, middleware, tenant resolution, and schema.
- No new Builder P0, P1, P2, or P3 visual findings.

## 8. Recommendation

Builder visual polish is verified and ready to close. Track the fresh-user
normal-login/session issue as a separate authentication ticket before claiming
the complete signup-to-login lifecycle is production-ready. No further Builder
code changes are recommended for RCCF-70.4.6.1.

No commit was created.
