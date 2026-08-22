# RCCF-72.18D.7.5 — WhatsApp Commerce End-to-End Customer CTA Verification — Closure

## 1. Executive Verdict

**B — IMPLEMENTED / TEST VERIFICATION REMAINING**

The application-side WhatsApp commerce contract is fully correct and now
verified end-to-end up to WhatsApp's own confirmation surface: storefront CTA →
canonical `wa.me` link → **WhatsApp's own page displaying "Chat on WhatsApp
with +91 86687 67875" and the exact decoded prefilled inquiry** → WhatsApp Web
deep-link carrying identical parameters. The final human hop (scan-to-link a
WhatsApp session, press Send, creator receives the message) cannot be executed
from this automation environment — this browser session is unlinked and
WhatsApp Web presents its QR login. Per verdict rules that boundary is honest:
**MESSAGE ACTUALLY SENT / MESSAGE RECEIVED = NOT AVAILABLE TO VERIFY here**;
the project owner can complete it in one manual pass using the evidence below.

One real defect was found in audit and fixed with the smallest safe change:
creators entering a bare phone number lost the WhatsApp CTA silently (§3/§17).

Layer classification (never combined):

| Layer | Status |
|---|---|
| REPOSITORY VERIFIED | Helper/renderer/aggregate contracts + focused suite 8/8 + regression matrix |
| STOREFRONT VERIFIED | Live dev storefront: WHATSAPP & BOTH CTAs render, clickable, correct hrefs |
| WHATSAPP URL VERIFIED | `https://wa.me/918668767875?text=<encoded>` observed in DOM |
| WHATSAPP WEB OPEN VERIFIED | wa.me → api.whatsapp.com → web.whatsapp.com deep-link, params intact |
| MESSAGE PREFILL VERIFIED | WhatsApp's own confirmation page shows recipient + decoded message verbatim |
| MESSAGE ACTUALLY SENT VERIFIED | NOT AVAILABLE TO VERIFY (requires human-linked WhatsApp session) |
| MESSAGE RECEIVED VERIFIED | NOT AVAILABLE TO VERIFY |

## 2. Baseline

D.7.4 closure reviewed; its four staged artifacts intact (staged tree: 65
files / 13,535 insertions incl. full D-chain). Registry read back:
DIRECT_CREATOR `active`, PLATFORM_COLLECT `active` (re-pinned by the new D.7.5
guardrail). Dirty working tree unchanged; no destructive git operation used.

## 3. Existing WhatsApp Architecture

Canonical implementation (`src/lib/commerce/whatsapp.ts`, RCCF-66.2) — reused,
not duplicated:

- `resolveWhatsAppDestination(heroSocialLinks)` — server-only resolution from
  Hero socialLinks (`platform === "whatsapp"`).
- The website aggregate (`website-aggregate.service.ts`) resolves ONCE at
  build/publish time and bakes `whatsappUrl` into EVERY product of the
  published snapshot — the storefront client can never supply a number.
- `buildWaMeLink(destination, message)` → `https://wa.me/<digits>?text=<encodeURIComponent(message)>`.
- `extractWhatsAppNumber` — strict boundary: wa.me / *.wa.me / api.whatsapp.com /
  *.whatsapp.com hosts, or bare-digit shape (7–15 digits); everything else "".
- Renderer (`renderers.tsx ProductCardCtas`): mode gating ONLINE/BOTH/WHATSAPP;
  preview renders a DISABLED button (inert); empty destination degrades to a
  non-clickable label (never a broken link).

## 4. Destination-Number Resolution

Server/configuration-derived only: Hero settings (`Setting key="hero_data"`,
`.socialLinks[]`). No client input reaches the recipient. Test destination
`+91 86687 67875` was supplied through exactly this legitimate configuration
surface on the test tenant (dev DB fixture via hero_data update + republish) —
NOT hardcoded into source, `.env`, or any persistent app config.

## 5. URL Construction

Observed live in the rendered DOM for the WHATSAPP probe product:

```
https://wa.me/918668767875?text=Hi!%20I'd%20like%20to%20order%3A%20D75%20%22WA%22%20%26%20%3CProbe%3E%2050%25%20OFF%0APrice%3A%20%E2%82%B9499
```

- no `+`, no spaces, no parentheses, no hyphens in the path ✓
- country-code normalization: creator entered `+91 86687 67875`; canonical
  destination is `918668767875` (E.164 without `+`) — never the bare 10-digit
  local form ✓ (the system deliberately does NOT invent a country code when the
  creator omits one; geography is creator-config responsibility, documented)
- built exclusively through the repository's existing helpers + safeUrl
  lineage ✓

## 6. Message Contract

Decoded message (confirmed by WhatsApp's own confirmation page):

```
Hi! I'd like to order: D75 "WA" & <Probe> 50% OFF
Price: ₹499
```

- product name ✓; store context comes from the chat target itself; product URL
  appended when available (probe products had none — line correctly omitted)
- price is DISPLAY ONLY (`formatCurrency`), explicitly non-authoritative
- NO payment credentials, paymentAccountId, tenantId, internal database IDs,
  refund info, secrets, or tokens — the builder consumes only name/price/url
  and adds nothing else ✓
- lead/inquiry semantics only; clicking creates nothing (§10)

## 7. Commerce Mode Matrix (live storefront)

| Mode | Rendered CTAs (observed) | Razorpay dependency |
|---|---|---|
| WHATSAPP (`D75 "WA" & <Probe> 50% OFF`) | "Order on WhatsApp" ONLY — no Buy Now | NONE |
| BOTH (`D75 Both Probe`) | Buy Now AND "Order on WhatsApp" | CTA itself NONE; online purchase separately gated as designed |
| ONLINE | Buy Now per existing UX (no WhatsApp invented) | Razorpay for payment |

BOTH did NOT collapse to ONLINE-only; WHATSAPP is structurally independent of
PaymentAccount/readiness — the renderer path imports nothing from payment-account.

## 8. Payment-Readiness Independence

Code-level: no readiness/PaymentAccount lookup exists anywhere in the
CTA→href path (renderer + aggregate verified by focused tests). Behavioral:
the WHATSAPP probe rendered and linked while the tenant's payment state was
never consulted; D.7.2 previously proved live that disconnected/unverified
states do not affect WHATSAPP-mode selling (selling-gate exemption), and D.7.1
suite pins ONLINE/BOTH gating vs WHATSAPP exemption. The two commerce paths
are independent.

## 9. Security Audit

- Recipient: server-derived from hero config; client cannot inject ✓
- `safeUrl` boundary intact (http(s)-only at render); scheme attacks
  (`javascript:`/`data:`) yield no CTA — pinned by tests ✓
- message fully percent-encoded; hostile names round-trip exactly ✓
- no tenantId/paymentAccountId/secrets/internal IDs in message or href ✓
- preview mode: disabled `<button>` — navigation impossible ✓
- anonymous storefront gains no authenticated payment data (CTA path makes no
  authenticated/business reads; snapshot-baked value only) ✓

## 10. No-Order-Mutation Proof

DB counts before clicking: orders 7 / fulfillments 6 / billingEvents 9.
After clicking through both CTAs and completing the wa.me journey: **identical
(7 / 6 / 9)**; zero ProductOrders reference either probe product. Clicking
WhatsApp creates no order, fulfillment, BillingEvent, PaymentAccount activity,
refund state, or checkout session — by design and proven.

## 11–12. Desktop WhatsApp Web Test & Mobile

Desktop chain captured live:

1. Storefront `/testcreator` → WHATSAPP product card.
2. CTA href inspected (§5).
3. Navigation to the href → `api.whatsapp.com/send/?phone=918668767875&text=…`
   ("Share on WhatsApp").
4. WhatsApp's own page: **"Chat on WhatsApp with +91 86687 67875"** +
   verbatim decoded message ("Continue to WhatsApp Web" / "Open app" offered).
5. "Continue to WhatsApp Web" → `web.whatsapp.com/send/?phone=…&text=…` —
   QR login presented (automation browser has no linked device). STOP point.
6. Mobile: NOT AVAILABLE TO VERIFY (no physical device in this environment);
   expected behavior documented (mobile → WhatsApp app handler via same link).

Safe evidence screenshots: `rccf7218d75-storefront-cta-both-modes.png`,
`rccf7218d75-whatsapp-confirm-recipient-prefill.png` (QR deliberately NOT
captured).

## 13. Manual Send Result

**NOT AVAILABLE TO VERIFY from this environment.** Completing it requires a
human: open any storefront WHATSAPP/BOTH product → click "Order on WhatsApp" →
link WhatsApp Web (or use a phone, where the app opens directly) → press Send
→ confirm receipt on 8668767875. Everything up to the composer pre-fill is
machine-verified; the send/receive hop is one manual action away.

## 14. Cost Boundary

Architecture contains zero messaging-provider integration: no WhatsApp
Business/Cloud API, no Meta credentials, no Twilio/Interakt/WATI/AiSensy/
Gupshup SDK or calls, no automated outbound requests — the only artifact is a
static hyperlink the customer clicks. Application-side messaging cost ₹0.
Opening/prefilling costs the application nothing; actually sending is an
ordinary WhatsApp message on the sender's own WhatsApp connection (normal data
usage) — not billed by this application.

## 15. Negative Tests (pinned in rccf72-18d75 suite)

- Missing number / non-whatsapp entry / null → "" (CTA degrades to non-link)
- `javascript:` / `data:` → "" (unsafe schemes can never become the recipient)
- foreign host with `?phone=` → ""
- hostile product name `"WA" & <Probe> 50% OFF` → fully percent-encoded,
  round-trips exactly through decodeURIComponent
- bare 10-digit without country code normalizes mechanically; system does not
  guess geography (creator config owns it — documented contract)
- preview inertness pinned at source level (disabled button branch)

## 16. Regression Tests

| Gate/Suite | Result |
|---|---|
| `npx tsc --noEmit` | PASS (0) |
| `npm run lint` | PASS (0) |
| `npm run build` | PASS |
| `npx prisma validate` | PASS |
| `git diff --check` | PASS (CRLF notices only, consistent baseline) |
| Focused: rccf72-18d75 (new) | 8/8 PASS |
| rccf66 whatsapp-commerce | 22/23 — the 1 failure is `persists commerceMode on create and update`, the SAME test documented pre-existing in the D.7.3 baseline (products-service selling-gate mock gap; unrelated file, untouched here) |
| commerce-strategy, D.7.1 selling gate, D.6.4 preactivation audit, hero-unification, communication | PASS (89/90 across the batch incl. above) |
| Registry after runs | DIRECT_CREATOR `active`, PLATFORM_COLLECT `active` |

Dev server restarted once post-build per lifecycle policy (worker 13492).

## 17. Implementation Changes

Exactly ONE source function changed — `resolveWhatsAppDestination`
(src/lib/commerce/whatsapp.ts):

- DEFECT: it applied the http(s)-only `safeUrl` gate BEFORE number extraction,
  so the documented bare-E.164 acceptance never survived the production path —
  a creator typing `+91 98765 43210` into the freeform social-link field got
  NO WhatsApp CTA, silently. (Helper-level bare-number support existed and was
  already test-pinned on `buildWaMeLink`; only the aggregate resolver killed
  it.)
- FIX: resolve via `extractWhatsAppNumber(link.url)` (which IS the security
  boundary: strict host checks or bare digits; every other scheme "") and
  return canonical `https://wa.me/<digits>`.
- Every previously pinned assertion still passes (full wa.me URLs canonicalize
  identically; non-wa.me hosts, unsafe schemes, wrong platforms → "").
- New capabilities covered by tests: bare `+91 …` numbers and protocol-less
  `wa.me/…` inputs now resolve.

No other application code changed. No second WhatsApp implementation, no API,
no provider.

## 18. Protected Work

No reset/checkout/stash/clean/amend/rebase. Staged D-chain/D.7.x tree
untouched (65 files intact before staging this ticket's delta). A temporary
publish-runner script (`scripts/tmp-d75-publish.ts`) was created for the
republish step and DELETED immediately after use — never staged. Dev-server
restarts followed the lifecycle skill. Unrelated dirty streams untouched.

Test fixtures left in dev DB (documented, deletable): hero_data whatsapp link
`+91 86687 67875`; products `D75 "WA" & <Probe> 50% OFF` (WHATSAPP) and
`D75 Both Probe` (BOTH).

## 19. Exact Staged Files

1. `src/lib/commerce/whatsapp.ts` — single-function defect fix (bare-number destination support)
2. `tests/unit/rccf72-18d75-whatsapp-cta.test.ts` — NEW focused suite (8 tests)
3. `docs/rccf-72.18d7.5-whatsapp-commerce-e2e-closure.md` — NEW (this document)

`git diff --cached --check`: PASS. Staged-diff secret scan: CLEAN (the test
destination number appears only as fixture/documentation data, per ticket
allowance).

## 20. DIRECT_CREATOR State

`active` (baseline + regression re-read). Untouched. PLATFORM_COLLECT
`active`. Untouched.

## 21. Commit / Push Status

Commit: **NOT CREATED**. Push: **NOT PERFORMED**. Work ends staged, per RCCF
discipline. STOP — no further RCCF started automatically.
