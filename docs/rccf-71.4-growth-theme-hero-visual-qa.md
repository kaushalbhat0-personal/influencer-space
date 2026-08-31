# RCCF-71.4 — Growth Theme + Hero Visual QA

## 1. Executive Visual Verdict

**Verdict: D — BLOCKED.**

This was a read-only browser QA pass. No application code, billing, capability,
publishing, or production data was modified. No commit was created.

The visual QA could not reach the actual CreatorStore Builder for the fresh
Creator Growth QA account. The normal login path returned to `/admin/login`,
matching the authentication/session blocker recorded in
`docs/rccf-70.4.6.1-authenticated-final-visual-verification.md`. The successful
signup browser context reached onboarding, but the selected **Build Manually →
Continue to Theme Selection** action remained on `/onboarding` for 30 seconds.

The report therefore records genuine browser evidence and the prior authenticated
Builder baseline, but does not claim visual verification of Growth controls,
Hero states, preview parity, or published parity.

## 2. Account and Access

- Existing configured account: `testcreator1@gmail.com` / local `.env.playwright`
  credentials. Login did not produce an authenticated Builder session.
- Fresh QA account: provisioned through the normal `/signup` flow as a Creator
  Growth account. Signup and workspace provisioning completed successfully.
- Fresh QA account normal login: **BLOCKED**. A new browser context returned to
  `/admin/login` after submitting the correct credentials.
- Fresh QA signup context: reached `/onboarding` without bypassing auth.
- Onboarding: **BLOCKED** at the manual-build continuation action. The button
  was visibly present and selected, but the route stayed `/onboarding` for 30s.
- Publishing: **NOT PERFORMED**.
- Existing production data: not modified.

## 3. Growth-Tier Value Verdict

**Unverifiable in this run.**

The repository reports establish that Growth controls exist and are wired, but
this ticket requires actual rendered evidence. Because the QA account could not
reach Builder, I cannot responsibly decide whether Growth feels substantially
more valuable than Launch. The captured onboarding screen communicates a dark,
indigo premium direction, but that is not evidence of Growth theme/background/
surface/typography/Hero value.

## 4. Browser Evidence

### Current RCCF-71.4 screenshots

- `screenshots/rccf-71.4-signup-result-2.png` — successful fresh Creator Growth
  account provisioning result.
- `screenshots/rccf-71.4-onboarding-start.png` — authenticated onboarding start.
- `screenshots/rccf-71.4-theme-selection-settled.png` — authenticated onboarding
  after selecting Build Manually; the visible continuation CTA did not navigate.
- `screenshots/rccf-71.4-after-manual.png` — same manual-build selection state.
- `screenshots/rccf-71.4-signup-result.png` — earlier provisioning state.
- `screenshots/rccf-71.4-local-initial.png` — unauthenticated Builder redirect.
- `screenshots/rccf-71.4-authenticated-desktop-1440.png` — attempted login did
  not authenticate; retained as a diagnostic capture, not Builder evidence.

### Prior authenticated baseline used for comparison only

These files predate RCCF-71.4 and were not treated as new Growth evidence:

- `screenshots/rccf-70.4.6.1-authenticated-desktop-1440.png`
- `screenshots/rccf-70.4.6.1-authenticated-390-canvas.png`
- `screenshots/rccf-70.4.6.1-authenticated-properties-390.png`
- `screenshots/after-live-hero-375.png`
- `screenshots/after-builder-mobile-frame.png`

## 5. Findings

### P1 — Normal authenticated login cannot be completed

- **Severity:** P1
- **Screenshot:** `screenshots/rccf-71.4-authenticated-desktop-1440.png`
- **Exact UI location:** `/admin/login` after submitting the configured Creator
  account credentials and after submitting the fresh QA account credentials in
  a new browser context.
- **Observed problem:** the browser returns to the login screen instead of
  reaching `/builder`.
- **Why it matters:** visual QA cannot use a repeatable authenticated session;
  it also blocks the requested saved-state → preview → published-state checks.
- **Recommended action:** track and fix the existing auth/session provisioning
  issue in a separate authentication ticket. Do not bypass auth for RCCF-71.4.

### P1 — Manual onboarding continuation does not advance

- **Severity:** P1
- **Screenshot:** `screenshots/rccf-71.4-theme-selection-settled.png`
- **Exact UI location:** `/onboarding`, expanded **Build Manually** card, bottom
  **Continue to Theme Selection** button.
- **Observed problem:** the CTA is visibly present, selected through the normal
  flow, and remains on `/onboarding` after 30 seconds. No Builder or theme
  selection screen appears.
- **Why it matters:** a fresh QA Creator cannot reach the actual Builder through
  the normal product journey, so the required visual QA cannot begin.
- **Recommended action:** diagnose the onboarding action response/error state
  and make failures visible. Keep the normal signup/onboarding/auth boundary;
  do not provision a bypass session.

### P1 — Long Hero identity clips in the 390px Builder canvas baseline

- **Severity:** P1
- **Screenshot:** `screenshots/rccf-70.4.6.1-authenticated-390-canvas.png`
- **Exact UI location:** Builder mobile canvas, Hero H1 identity line.
- **Observed problem:** the long `RCCF 70.4.6.1 QA` Hero title visibly extends
  beyond the 390px canvas edges and is clipped on both sides.
- **Why it matters:** this is directly relevant to RCCF-71.4 Hero responsive
  quality at 390/375/320px. Creator names and titles must remain readable on
  narrow screens before alignment, width, and overlay variations can be called
  professional.
- **Recommended action:** inspect the rendered mobile Hero typography/wrapping
  with long identity content. Use the canonical renderer and preserve the
  existing Hero ownership/runtime; do not patch only the Builder canvas.

### P2 — Builder inspector/theme rail is visually dense at desktop width

- **Severity:** P2
- **Screenshot:** `screenshots/rccf-70.4.6.1-authenticated-desktop-1440.png`
- **Exact UI location:** right Website rail, Theme card grid and Progress card.
- **Observed problem:** theme cards are compact, labels truncate quickly, and
  the control surface presents many small low-emphasis labels inside a narrow
  rail. It reads as technically capable but closer to an admin inspector than
  a premium creator tool.
- **Why it matters:** Growth value depends on controls feeling intentional and
  understandable, not merely being present.
- **Recommended action:** after access is restored, visually review grouping,
  label legibility, selected/locked states, and explanatory copy at 1440px and
  mobile sheet widths. Do not copy unsupported Stitch controls.

### P2 — Onboarding copy has mojibake punctuation

- **Severity:** P2
- **Screenshot:** `screenshots/rccf-71.4-theme-selection-settled.png`
- **Exact UI location:** onboarding subtitle and expanded Build Manually copy.
- **Observed problem:** the browser visibly renders `â€”` instead of an em dash
  in phrases such as “Nothing is permanent â€”” and “No AI, no imports â€””.
- **Why it matters:** encoding artifacts reduce perceived polish at the first
  product touchpoint and are especially damaging to a premium creator product.
- **Recommended action:** verify UTF-8 source/response handling for onboarding
  copy. This is outside the frozen Growth theme/Hero scope and should be tracked
  separately.

## 6. Desktop Findings

The prior authenticated 1440px baseline shows a coherent dark shell, clear
canvas/rail separation, visible section list, and indigo/green action hierarchy.
The right rail remains information-dense and small-label heavy. The new Growth
Appearance controls, Hero presentation groups, locked state, and saved values
were **not reachable in this run**, so no desktop verdict is made on those
controls.

## 7. Mobile Findings

The prior 390px baseline shows the bottom navigation and canvas frame operating,
media and CTA composition rendering, but this run did not exercise left/center/
right alignment, narrow/medium/wide content widths, overlay presets, or the
320px frame. Those states remain unverified.

## 8. Theme Findings

- **Background experience:** not visually tested in RCCF-71.4; Builder blocked.
- **Surface options:** not visually tested in RCCF-71.4; Builder blocked.
- **Typography controls:** not visually tested in RCCF-71.4; Builder blocked.
- **Radius/density:** not visually tested in RCCF-71.4; Builder blocked.
- The prior Builder baseline has a coherent dark tonal foundation, but it does
  not prove Growth transformations.

## 9. Hero Findings

- **Default Builder:** prior baseline captured; new Growth state unverified.
- **Left / center / right alignment:** unverified in browser.
- **Content width variations:** unverified in browser.
- **Overlay variations:** unverified in browser.
- **Video/poster/media:** prior visual evidence shows a strong media-first Hero
  with avatar overlap and readable CTA/social treatment; the RCCF-71.4
  representative focal-position state was not exercised.
- **Alignment coherence:** the known risk that CTA/social rows remain centered
  while Hero copy moves left/right could not be judged visually because the
  controls were inaccessible. It must remain a required follow-up observation,
  not an assumed acceptance.

## 10. Builder UX Findings

Positive baseline evidence:

- Desktop canvas, Sections rail, Properties rail, and Theme rail are visually
  distinct and readable at a high level.
- Mobile bottom navigation and the Properties sheet were previously captured.
- The product has a recognizable dark creator-tool identity rather than a plain
  CRUD layout.

Unverified:

- Growth lock messaging and upgrade CTA.
- Appearance panel grouping and technical/non-technical clarity.
- Hero presentation control labels and touch targets.
- Saved-state feedback after each control change.
- Settled loading behavior in the current build.

## 11. Stitch Comparison

The prior CreatorStore Builder baseline retains its own dark, indigo creator-tool
identity and should not be pixel-matched to Stitch. Relative to the Stitch
references, the main unanswered question is whether the Growth controls create
the same sense of deliberate visual authorship: expressive but bounded
backgrounds/surfaces, readable typography choices, and useful Hero composition.

No Stitch control should be recommended solely because it exists in Stitch.
Opacity, custom gradient editing, arbitrary overlay color/opacity, and other
features remain deferred unless the CreatorStore runtime can safely own them.

## 12. Launch vs Growth Experience

**Not verifiable.** The account was selected as Creator Growth through the normal
signup flow, but Builder access failed before any Launch-vs-Growth comparison.
The next pass must capture at minimum:

- Launch locked Appearance/Hero controls with plain-language value messaging.
- Growth unlocked controls with visible canvas changes.
- No client-facing technical capability names or plan-code language.
- Scale regression check only after Growth evidence is complete.

## 13. Preview vs Published Parity

**Not tested.** Publishing was intentionally not performed because the QA flow
could not reach Builder and the user explicitly prohibited destructive/unwanted
production changes. No claim is made for representative states A–H:

- A premium dark + centered Hero
- B left + wide + strong overlay
- C right + narrow + soft overlay
- D background experience
- E surface experience
- F typography
- G radius/density
- H media with focal positioning

## 14. Requested Coverage Matrix

| Requested capture/state | Result |
| --- | --- |
| Default Builder | Prior baseline exists; RCCF-71.4 fresh capture blocked |
| Theme/Appearance panel | Blocked |
| Growth background options | Blocked |
| Surface options | Blocked |
| Typography controls | Blocked |
| Hero presentation controls | Blocked |
| Hero left / center / right | Blocked |
| Hero content widths | Blocked |
| Hero overlays | Blocked |
| Hero video/poster/media | Prior baseline only; representative RCCF-71.4 state blocked |
| Sections panel | Prior baseline exists |
| Properties panel | Prior baseline exists |
| Settled 320px canvas | Not captured in RCCF-71.4 |
| Settled 375px canvas | Prior baseline exists |
| Settled 390px canvas | Prior baseline exists; clipping finding recorded |
| 1200px canvas / 1440px desktop | Prior baseline exists |
| Published storefront after Growth styling | Not performed |

## 15. P0/P1/P2/P3 Summary

- **P0:** none observed.
- **P1:** normal login/session failure; onboarding manual-build CTA does not
  advance; long Hero identity clips in the 390px Builder canvas baseline.
- **P2:** dense/truncated Builder inspector presentation; onboarding mojibake
  punctuation; all Growth visual value questions remain blocked, not graded.
- **P3:** none assigned from this incomplete pass.

## 16. Recommended Fixes

1. Fix or separately track the normal login/session provisioning blocker and
   confirm a fresh Creator can authenticate in a new browser context.
2. Fix or separately track the onboarding manual-build continuation action and
   surface server/action errors instead of leaving a seemingly active CTA inert.
3. Re-run actual Builder QA at 1440px with 1200px canvas and at 320/375/390px.
4. Address the long Hero identity clipping using the canonical Hero renderer,
   then re-evaluate left/right alignment and CTA/social row coherence.
5. Capture Growth background, surface, typography, radius/density, and Hero
   presentation transformations before making a Growth-tier value decision.
6. Run representative saved-state → preview route → published storefront parity
   checks on a QA site only, with no destructive production publish.
7. Separately correct the visible onboarding encoding artifact.

## 17. Features That Should NOT Be Changed

- Do not bypass authentication or manufacture a session for visual QA.
- Do not modify billing, plan definitions, capability enforcement, or Razorpay.
- Do not move Hero content out of `hero_data` / Settings ownership.
- Do not create a second theme or Hero presentation authority.
- Do not add Stitch-only arbitrary opacity, gradient-stop, overlay-color, or
  unsupported background controls.
- Do not publish representative styles to an existing production site.
- Do not redesign the Hero structure merely to match Stitch placement.

## 18. Deferred Capabilities

Continue classifying these as deferred unless the existing runtime can safely
represent them:

- Hero vertical composition.
- Arbitrary overlay color/opacity and custom gradient stops.
- Theme-level background image layers and opacity controls.
- Surface opacity/blur intensity editing.
- Full typography scale and hierarchy editing.
- Shadow/elevation authoring.

## 19. Final Recommendation

Do not close RCCF-71.4 as a visual pass yet. Resolve the authentication/session
and onboarding access blockers, then repeat the browser QA with the fresh QA
Creator account. The existing Builder baseline is visually credible, but the
central question — whether Growth feels paid and whether the new Hero controls
produce coherent, professional compositions across Builder, preview, and
published storefront — remains unanswered by actual rendered evidence.

RCCF-71.4 visual QA complete.
Verdict: D.
