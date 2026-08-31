# RCCF-71.4.2 — Final Growth Theme + Hero Visual QA

## 1. Executive Verdict

**Verdict: D — BLOCKED.**

This was a read-only browser QA pass through the normal product flow using a
fresh Creator Growth account. Signup, onboarding, manual provisioning, and
authenticated Builder access all succeeded. The visual pass stopped at the
Builder because the fresh Growth account received a locked Appearance panel:
the UI states that custom appearance requires a **Creator Grow** plan and all
Theme and Hero controls were disabled. The requested Growth transformations
therefore could not be safely exercised. No application code was modified and
no commit was created.

## 2. Growth Paid-Value Verdict

**Unverifiable / blocked.** The signup UI visibly offered and selected
**Creator Growth** with copy promising “premium themes and a full visual
builder.” In Builder, the Appearance panel displayed:

> Custom appearance (fonts, background, surface, heading weight, hero
> presentation) requires a Creator Grow plan. Upgrade

The controls for Font, Heading Weight, Background, Surface, Hero Text
Alignment, Hero Content Width, and Hero Overlay were disabled. A Growth value
judgment cannot responsibly be made when the selected Growth account cannot
access the promised controls.

## 3. Access Flow

| Step | Result | Evidence |
| --- | --- | --- |
| Fresh signup as Creator Growth | PASS | Signup UI showed Creator Growth at ₹999/mo during the browser flow |
| Build Manually | PASS | `rccf-71.4.2-onboarding-manual.png` |
| Continue to Theme Selection | PASS | `rccf-71.4.2-admin-create.png`; landed on `/admin/create` |
| Enter Builder | PASS | `rccf-71.4.2-growth-desktop-initial.png`; `/builder` rendered |
| Authenticated Builder access | PASS | Builder shell showed the fresh creator name and live controls |
| Growth Appearance/Hero access | **BLOCKED** | `rccf-71.4.2-growth-desktop-initial.png` |

The account was not bypassed, upgraded through billing, or modified through the
database. No separate Launch comparison account was created because the
Growth entitlement mismatch stopped the requested Growth test at its first
visual control gate.

## 4. Builder Visual Verdict

The Builder shell itself is visually coherent at the captured desktop width:
the Sections rail, central 1200px canvas, Website rail, theme cards, and
bottom save/publish status are clearly separated. The dark indigo creator-tool
identity is recognizable and the information architecture is understandable at
a high level.

However, the right rail is still dense and the primary premium surface is
visibly locked. The screenshot shows many theme cards, but the controls that
would establish Growth authorship are unavailable. This prevents a verdict on
whether the Builder feels premium rather than like an admin inspector after
customization.

## 5. Theme Verdict

**Not tested.** The following controls were visible but disabled in the fresh
Growth Builder:

- Font: Geist, Inter, IBM Plex, JetBrains Mono
- Heading Weight: Medium, Semibold, Bold, Extrabold
- Background: Solid, None, Midnight, Gradient, Radial, Mesh, Aurora, Pattern
- Surface: Flat, Minimal, Elevated, Glass, Soft Glow, Gradient Border,
  Floating, Luxury, Neon

Because the controls could not be changed, there is no valid before/after
evidence for background, surface, typography, radius, or density. Radius and
density controls were not exposed in the reachable locked panel and were not
invented or tested.

## 6. Hero Verdict

**Not tested as a Growth configuration.** The following Hero presentation
controls were visible but disabled:

- Text alignment: Left, Center, Right
- Content width: Narrow, Medium, Wide
- Overlay: None, Soft, Medium, Strong

The baseline Hero rendered in the Builder, but the requested configurations A,
B, and C could not be applied. Existing media/focal positioning could not be
tested as part of a Growth configuration. CTA/social alignment parity could
not be judged after left/right alignment because those states were unreachable.

## 7. Desktop Verdict

Captured at a 1440px browser viewport with the Builder canvas reporting 1200px.

Positive observations:

- Sections rail is visually distinct from the canvas.
- Website rail has clear Theme and Appearance groupings.
- Theme cards expose current/free/essential/professional labels and selected
  state.
- Save, Publish, View Live, Draft, and Live status affordances are discoverable.
- Baseline Hero hierarchy is visible in the canvas.

Blocking observation:

- The Appearance panel is disabled for the fresh Creator Growth account and
  redirects the value proposition to Upgrade.


The Builder was captured at 390px, 375px, and 320px. Measured document and body
scroll widths matched the viewport widths in the harness, but the rendered Hero
identity visibly clipped at the left edge in all three screenshots:

- `rccf-71.4.2-growth-locked-390.png`
- `rccf-71.4.2-growth-locked-375.png`
- `rccf-71.4.2-growth-locked-320.png`

The mobile Builder toolbar and bottom Sections / Canvas / Properties navigation
were visible. Theme and Hero controls were not meaningfully usable in the
locked mobile state. Because the Hero title is clipped in the captured Builder
canvas, mobile results are not production-quality.

## 9. Launch vs Growth Comparison

**Not performed.** A separate Launch account was not created because the fresh
Growth account itself failed the entitlement/access prerequisite. The observed
Growth state already presents the same functional result expected from a
locked tier: disabled controls and an Upgrade message. No billing enforcement
was tested or changed.

## 10. Builder → Preview → Storefront Parity

**Not tested.** The required representative Growth configuration could not be
created or saved. No Growth configuration was published, and no preview-route
or published-storefront parity claim is made.

The QA site was not published to the public storefront during this blocked
pass.

## 11. Stitch Comparison

The canonical Stitch Builder and Storefront references were not used for a
feature-by-feature visual comparison because CreatorStore's Growth controls
were inaccessible. The appropriate comparison remains quality-oriented rather
than pixel-oriented:

- Preserve CreatorStore's dark creator-tool branding and existing information
  architecture.
- Preserve the existing Hero content ownership, commerce model, and capability
  authority.
- Do not copy Stitch-only arbitrary gradient, opacity, overlay, or background
  authoring controls without a safe existing runtime authority.

The useful Stitch-level product quality to pursue later is clearer visual
authorship: a small set of understandable controls should produce visibly
distinct, coherent results without making the Builder rail more technical.

## 12. Findings

### P1 — Creator Growth account cannot access Growth Appearance/Hero controls

- **Screenshot:** `screenshots/rccf-71.4.2-growth-desktop-initial.png`
- **Exact location:** Builder right Website rail, Appearance card.
- **Observed issue:** Fresh signup selected Creator Growth, but the card says
  custom appearance requires “Creator Grow”; Font, Heading Weight, Background,
  Surface, Hero Text Alignment, Hero Content Width, and Hero Overlay controls
  are disabled.
- **Why it matters:** The paid-tier promise cannot be visually evaluated or
  delivered through the normal Growth account path. This blocks the core
  product-value question and makes the advertised “premium themes and a full
  visual builder” unavailable to the selected tier.
- **Recommended action:** Reconcile the normal signup plan identity and the
  server-derived premium-theme entitlement. Re-run this exact fresh-account
  visual QA only after the Creator Growth account visibly receives unlocked
  controls. Do not bypass the capability authority or hardcode a client-side
  plan check.

### P1 — Hero identity still clips in the mobile Builder canvas

- **Screenshots:** `rccf-71.4.2-growth-locked-390.png`,
  `rccf-71.4.2-growth-locked-375.png`,
  `rccf-71.4.2-growth-locked-320.png`
- **Exact location:** Builder mobile canvas, Hero identity heading.
- **Observed issue:** The fresh creator name extends past the left edge of the
  visible canvas at all three requested viewport widths. The text wraps onto a
  second line, but the first line is horizontally clipped.
- **Why it matters:** Mobile Hero identity is not reliably readable, and this
  directly fails the requested production-quality check at 390/375/320px.
- **Recommended action:** Reproduce with the settled Builder canvas and inspect
  the actual frame/container boundary and heading width. Apply the fix only in
  the canonical runtime path; do not patch a screenshot or Builder-only shell.
  Re-capture all three widths after correction.

### P2 — Onboarding copy visibly contains mojibake punctuation

- **Screenshot:** `rccf-71.4.2-onboarding-manual.png`
- **Exact location:** Onboarding subtitle and expanded Build Manually copy.
- **Observed issue:** Text renders `â€”` instead of an em dash in phrases such as
  “Nothing is permanent â€”” and “No AI, no imports â€””.
- **Why it matters:** Encoding artifacts reduce polish at the first product
  touchpoint, particularly for a paid creator product.
- **Recommended action:** Track and correct UTF-8 source/response handling in a
  separate scoped ticket.

No P0 or P3 findings were assigned. No visual claim was made for controls that
could not be changed.

## 13. Screenshots Captured

- `screenshots/rccf-71.4.2-onboarding.png`
- `screenshots/rccf-71.4.2-onboarding-manual.png`
- `screenshots/rccf-71.4.2-admin-create.png`
- `screenshots/rccf-71.4.2-growth-desktop-initial.png`
- `screenshots/rccf-71.4.2-growth-locked-390.png`
- `screenshots/rccf-71.4.2-growth-locked-375.png`
- `screenshots/rccf-71.4.2-growth-locked-320.png`

The desktop screenshot is a 1440px browser capture with a 1200px Builder
canvas. The three mobile screenshots are 390px, 375px, and 320px browser
captures.

## 14. Recommended Fixes

1. Resolve the Creator Growth versus Creator Grow entitlement mismatch through
   the existing server-derived capability path.
2. Re-run the full Growth visual matrix only after controls are unlocked:
   background, surface, typography, heading weight, radius/density if exposed,
   and the three Hero configurations.
3. Investigate the settled mobile Builder Hero container/heading clipping at
   390/375/320px.
4. Correct onboarding UTF-8 punctuation separately.
5. Complete Builder, preview route, and published-storefront parity on a QA
   site after at least one Growth configuration is actually saved.

## 15. Deferred Capabilities

Keep the previously documented deferred capabilities deferred unless the
existing architecture can safely own them:

- Hero vertical composition.
- Arbitrary overlay color, opacity, and custom gradient stops.
- Theme-level background image layers and opacity controls.
- Surface opacity/blur intensity editing.
- Full typography scale and hierarchy authoring.
- Shadow/elevation authoring.

Do not add Stitch-only controls to compensate for the entitlement blocker.

## 16. Features That Must Not Be Changed

- Do not bypass authentication or manufacture a QA session.
- Do not bypass the server-derived capability authority or hardcode plan names
  in the client.
- Do not modify billing, Razorpay, plan definitions, or billing enforcement as
  part of visual QA.
- Do not move Hero content out of `hero_data` / Settings ownership.
- Do not create a second theme or Hero presentation authority.
- Do not publish representative Growth styles to an existing production site.
- Do not copy Stitch-only arbitrary opacity, gradient-stop, overlay-color, or
  unsupported background controls.

## 17. Final Recommendation

Do not close the final Growth visual QA as passed. The normal access flow works,
but the selected Creator Growth account does not receive the promised unlocked
Theme/Hero controls, so Growth paid value, visual transformations, Hero
combinations, Launch-vs-Growth differentiation, and Builder/preview/storefront
parity remain unanswered. The mobile Hero clipping is an additional P1 visual
blocker. Resolve those blockers, then repeat this same read-only browser matrix
with a fresh QA account.

RCCF-71.4.2 final visual QA complete.
Verdict: D.
Growth value: D — blocked and not demonstrated.
