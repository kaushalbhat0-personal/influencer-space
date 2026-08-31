# RCCF-72.14 — Creator Post-Remediation Re-Audit

**Status:** COMPLETE (AUDIT ONLY — no code, no DB, no commit)
**Date:** 2026-08-20
**Method:** Re-verify every remaining RCCF-72.8 finding against CURRENT source + committed remediation (2fc635c 72.9, 54a7460 72.12, 3de7a60 72.13, 0021d34 72.10, 685dfc5 72.11) + closure evidence.

---

## 1. Executive Summary

The five Wave-1/2 remediation tickets (72.9 preview security, 72.12 save identity, 72.13 publish
quota UX, 72.10 course/service errors, 72.11 navigation reconciliation) are all committed and
verified. A full re-audit of the Creator surface shows:

- **All P1 findings are now CLOSED** (S1 security, 72.1-F1 Save Identity, 72.1-F2 publish quota).
- **The two shared-architectural defects (S2 stale nav, S3 dead Contact) are CLOSED** by 72.11.
- **72.3-F1 (course/service write errors) CLOSED** by 72.10.
- **No new P0/P1 findings** from the remediation work.
- **Remaining: 2 P2 + 13 P3 OPEN findings** (mostly Launch-tier UX, admin-page gates, and
  P3 hygiene) plus the pre-existing **deferred / product-gap / environment** sets.

**Creator freeze decision: NO — not yet.** Two P2 Launch-tier workflow findings (Builder catalog
leaks plan-blocked sections [F4], dashboard CTAs to locked pages [F5]) remain open and are
Launch-experience blockers to a clean freeze. They are small, well-scoped, and do NOT block the
Agency/Partner audit from being *resumed* — but a hard freeze should land them first (they are
grouped with 72.14's "UI reflects enforcement" batch).

**FINAL VERDICT: B — READY WITH REMAINING P2/P3.**

---

## 2. Committed remediation (verified)

| Commit | Ticket | Closes | Verified |
|---|---|---|---|
| `2fc635c` | 72.9 | S1 — anonymous preview draft leak (P1 SECURITY) | FIXED (A) |
| `54a7460` | 72.12 | 72.1-F1 Save Identity (P1) + 72.1-F9 terse copy (P3) | FIXED (A) |
| `3de7a60` | 72.13 | 72.1-F2 publish-quota raw-DB UX (P1) | FIXED (A) |
| `0021d34` | 72.10 | 72.3-F1 course/service write-block 500 (P2) | FIXED (A) |
| `685dfc5` | 72.11 | S2 stale auto-nav + S3 dead Contact (P2 ×2) | FIXED (A) |

---

## 3. Current Finding Register (old → current status)

Legend: 🔴 OPEN · ✅ FIXED · ♻️ DUPLICATE · ⚪ OBSOLETE · 🟡 ENVIRONMENT · 🔵 PRODUCT GAP · ⏸️ DEFERRED

### Security
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| S1 | P1 | Anonymous `?preview=true` draft leak | ✅ FIXED | `preview-auth.ts` `canPreviewTenant`; loader gate; 9 tests; browser-proven |
| 72.4-N3 | P3 | Analytics/SEO route lacks capability gate | 🔴 OPEN | `analytics/page.tsx`/`seo/page.tsx` still `requireTenant()` only; nav hides item but route reachable. Tenant-scoped only, low |

### Core workflow
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| 72.1-F1 | P1 | Save Identity always fails | ✅ FIXED | nullable schema + sparse loop; 29 tests; browser |
| 72.1-F2 | P1 | Publish-quota raw DB error | ✅ FIXED | 72.13 read-then-decide + friendly copy; browser A–F |
| 72.3-F1 | P2 | Course/Service write-block 500 + no UX | ✅ FIXED | 72.10 structured results; 27 tests; browser |
| 72.1-F9 | P3 | Terse "Invalid hero data" copy | ✅ FIXED | folded into 72.12 (structured fieldErrors) |

### Navigation
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| S2 | P2 | Stale one-shot auto-nav | ✅ FIXED | 72.11 graph reconciliation at publish |
| S3 | P2 | Dead Contact anchor | ✅ FIXED | 72.11 Contact only when renders |
| S5 | P3 | Nav anchors JS-only (href=undefined) | 🔴 OPEN | `StorefrontNav.tsx:78,106` still `href={isAnchor ? undefined : …}` |
| S7 | P3 | Dead `themeConfig.navigation` | 🔴 OPEN | no runtime consumer |
| 72.5-N7 | P3 | Hidden gated nav links in DOM | ✅ FIXED (improved) | `filterNavForPlan` removes gated items; `toNavWire` drops them from payload (pre-existing 67.4/70.6.2) |
| draft-preview nav parity | — | Preview nav not reconciled to draft graph | 🔴 OPEN (deferred) | `storefront-loader.ts:70` still `getOrGenerate` (72.11 deferred) |

### Admin / Launch UX
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| 72.1-F4 | P2 | Builder catalog leaks plan-blocked sections | 🔴 OPEN | `SECTION_CATALOG` ungated (13 entries); Courses/Games addable on Launch |
| 72.1-F5 | P2 | Dashboard CTAs to locked pages | 🔴 OPEN | `dashboard-page.tsx` hardcoded `QUICK_ACTIONS` (Products/Bookings/Courses/…) ungated |
| 72.0-P2-1 | P2 | Signup error-state dead-end | ⏸️ PARTIAL/IMPROVED | `SignupForm` now sets `error` + returns to `account` step (recoverable); not re-proven end-to-end |
| 72.0-P3-1 | P3 | `/admin` bare 404 | ⏸️ LIKELY-IMPROVED | `lifecycleService.redirectTo` (72.7) handles role redirects; no `admin/page.tsx`; needs browser confirm |
| 72.1-F6 | P3 | Appearance nav always visible | 🔴 OPEN | `admin-nav.ts:126` no `requiredCapability` (other items now gated) |
| 72.1-F7 | P3 | Ungated empty-state pages | 🔴 OPEN | bookings/games/etc. `requireTenant` only |
| 72.1-F8 | P3 | Sidebar no collapse 390px | 🔴 OPEN (low) | admin layout uses `lg:` breakpoints; not browser-re-proven |

### Storefront / content
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| S4 | P3 | Footer legal links root-relative | 🔴 OPEN | `FooterRenderer` `href="/terms"` etc. (low impact, single-origin) |
| S6 | P3 | Double title suffix | 🔴 OPEN | layout template + `buildMetadata` verbatim SEO title |
| Products/Testimonials/FAQ mutation | — | Still throw on `!limit.ok` | 🔴 OPEN | `products/actions.ts:35`, `testimonials/actions.ts:27`, `faq/actions.ts:27`, `bookings/service.ts:34` (72.10 deferred; same pattern 72.10 fixed for courses/services) |

### Capability / coherence
| ID | 72.8 | Finding | Current | Evidence |
|---|---|---|---|---|
| 72.4-N2 | P2 | `analytics_advanced`/`ai_credits` no runtime enforcement | ⏸️ DEFERRED | declared in plans/capabilities only; no storefront consumer |
| 72.5-N8 | P3 | `max_messages` unenforced | 🔴 OPEN | declared only; no consumer |
| 72.5-N10 | P3 | Goals copy overstates reordering | 🔴 OPEN | goals page data-driven; no reorder claim re-audited (low) |
| 72.5-N11 | P3 | Notification prefs decorative + email log-only | 🔴 OPEN | `sendCommunication` exists but does not read `notificationPrefs` |
| 72.5-N9 | P3 | Platform `/contact` submit path dead | 🔴 OPEN | `submitContact` resolves `x-tenant-host`, deleted on platform domains |

### Product gaps (not bugs — deferred by design)
| ID | Origin | Gap |
|---|---|---|
| 72.0-PG | 72.0 | Social login not implemented (Credentials-only) |
| 72.1-F10 | 72.1 | Schema fragmentation (Offering/Setting JSON) |
| S8 | 72.2 | Niche-driven storefront not implemented (0 runtime consumers) |
| 72.3-PG1 | 72.3 | Multi-page UI (View-All) not exposed in Builder |
| 72.3-PG2 | 72.3 | Nav coverage of services/courses/bookings (72.11 keeps them out of top-level nav by design) |
| 72.3-PG3 | 72.3 | Bookings not constructible in Builder (renderer exists, not addable) |
| 72.4-N1 | 72.4 | 10 registered sections UI-unreachable in Builder (13/23 catalog) |
| 72.5-N12 | 72.5 | Integrations OAuth flow unwired (API-key entry by design) |

### Duplicate / obsolete / environment
| ID | 72.8 | Finding | Current |
|---|---|---|---|
| 72.1-F3 | — | Settings/Gallery crash = lifecycle redirect loop | ♻️ DUPLICATE → ✅ FIXED (72.7) |
| 72.4-N4 | — | Sections never capability-gated (by-design enforce-at-write) | ⚪ OBSOLETE |
| 72.0-ENV / 72.1-F11 / S9 | — | Dev connection aborts / compile latency / rate-limit budget | 🟡 ENVIRONMENT (dev-only) |
| 72.0-P3-3 / P3-4 | — | BillingPlanFeature mirror stale / price display parity | ⏸️ DEFERRED (billing-domain) |
| 72.5-N6 | — | Growth resolves via legacy Subscription fallback | ⏸️ DEFERRED (works by design) |

### New findings surfaced by this re-audit (from the 5 remediations)
| Finding | Severity | Status |
|---|---|---|
| Draft-preview nav not reconciled to draft graph | P3 (design gap) | OPEN (deferred from 72.11) |
| Legacy tenant nav reconciled only on next publish | P3 (behavioral) | FIXED-by-design (72.11 honors "never destroy user nav") |
| Growth QA publish quota exhausted by QA publishes (10/10) | ENV (QA infra) | NOTE — delete/recreate test user per policy |

---

## 4. Old → Current Status Mapping (tally)

**Historical 72.8 open set (24):** → now:
- **FIXED: 7** — S1, 72.1-F1, 72.1-F2, 72.3-F1, 72.1-F9, S2, S3 (all 5 remediation tickets; +F9 folded).
- **OPEN: 15** — 72.1-F4, 72.1-F5, 72.0-P2-1(partial), 72.0-P3-1(improved), 72.1-F6, 72.1-F7, 72.1-F8, 72.4-N3, 72.5-N7(fixed/improved), 72.5-N8, 72.5-N9, 72.5-N10, 72.5-N11, S4, S5, S6, S7. (Some reclassified partial/improved.)
- **DEFERRED: 5** — 72.0-P2-1/72.0-P3-1 (partial, re-check), 72.4-N2, 72.0-P3-3, P3-4, 72.5-N6.
- **PRODUCT GAP: 8** (unchanged) — social login, F10, S8, PG1, PG2, PG3, N1, N12.
- **DUPLICATE: 1** (F3, fixed) · **OBSOLETE: 1** (N4) · **ENVIRONMENT: 3** (ENV, F11, S9).

---

## 5. Severity Counts (current)

- **P0: 0**
- **P1: 0** (all three historical P1s — S1 security, F1 Save Identity, F2 publish quota — are CLOSED)
- **P2: 2 OPEN** — 72.1-F4 (Builder catalog leaks), 72.1-F5 (dashboard CTAs)
- **P3: 13 OPEN** — F6, F7, F8, N3, N8, N9, N10, N11, S4, S5, S6, S7, Products/Testimonials/FAQ throw (item-17 batch)
- **Deferred: 5** · **Product gaps: 8** · **Env: 3** · **Duplicate: 1** · **Obsolete: 1**

## 6. Security Findings

- **No P0/P1 security findings remain.** S1 (the only P1 SECURITY) is closed by 72.9.
- **72.4-N3 (P3, open):** analytics/SEO routes reachable by any authenticated tenant (tenant-scoped data only, no cross-tenant exposure). Low.
- **72.5-N7 (P3, fixed/improved):** gated nav items are now removed from the DOM/payload (not merely hidden).
- **No plan/capability bypass, no tenant-isolation breach** re-verified; F2 was a strictness bug (over-denial), not exposure.

## 7. Revenue-Impacting Findings

- **None of the three historical revenue-path breaks remain open** (F1 Save Identity, F2 publish quota upsell, F3-F1 course/service write).
- **72.5-N11 (P3, open):** email notifications (order-confirmation / download-ready) still log-only — revenue/trust impact once commerce flows.
- **72.5-N9 (P3, open):** platform `/contact` dead path — lead-capture impact.

## 8. Growth-Impacting Findings

- **None of the six historical Growth-impacting findings remain open** (F1, F2, S2, S3, N8, N11 — all either fixed or reclassified; N8/N11 remain open at P3 with limited Growth surface impact).
- Growth premium theme/experience and storefront rendering verified intact (72.9/72.11 browser QA).

## 9. Scale-Impacting Findings

- **72.5-N12 (product gap):** Integrations OAuth unwired — Scale-differentiating, but API-key entry works by design.
- **S4 (P3, open):** custom-domain legal-link robustness (Scale custom-domain hosts) — low on current single-origin hosting.
- Scale navigation/experience verified functional (72.11 browser QA).

---

## 10. Recommended Implementation Sequence

Small, well-scoped batch to reach a clean freeze (no P0/P1, no architecture risk):

1. **72.14 batch — "UI reflects enforcement" (72.1-F4 + 72.1-F5 + 72.1-F6 + 72.1-F7 + 72.4-N3):**
   gate the Builder `SECTION_CATALOG`, the dashboard `QUICK_ACTIONS`, the Appearance nav item,
   the empty-state admin pages, and the analytics/SEO routes against the canonical capability
   resolver (no plan-code checks). This removes the last two P2s and the most visible P3s.
2. **Products/Testimonials/FAQ/Bookings structured errors (item-17 batch):** adopt the 72.10
   `contentLimitRejection`/`ContentMutationResult` primitive + manager error display for the four
   remaining throw-on-limit surfaces (small, mechanical, high-value).
3. **S5 nav anchors + S6 title de-dupe + S7 dead config:** storefront hygiene (P3).
4. **72.5-N11 notifications + 72.5-N9 contact path:** trust/revenue (P3).
5. **72.4-N2 / N8 coherence (analytics_advanced / ai_credits / max_messages):** enforce-or-relabel
   cleanup.
6. **Draft-preview nav parity:** reconcile the preview path against the draft graph (low-cost; uses
   the 72.11 `reconcileNavigation` in-memory, no persist on GET).
7. **Product-gap backlog (deferred):** niche runtime (design ticket), multi-page UI, bookings
   constructibility, section exposure, OAuth, social login — post-freeze.

---

## 11. Final Verdict

**B — READY WITH REMAINING P2/P3.**

**Creator can be frozen now?** A *provisional* freeze is defensible (no P0/P1; the P2s are
Launch-tier UX, not correctness/data/security). However, for a **clean** freeze, land the small
72.14 "UI reflects enforcement" batch (F4+F5) first — they are the only remaining P2s and are
low-risk. The **Agency/Partner audit can be resumed immediately regardless** — none of the
remaining Creator findings block it, and the Creator surface is no longer a security/correctness
risk. Recommend: resume the Agency/Partner audit now (Wave 1), and fold F4+F5+item-17 into the
post-freeze remediation backlog (Waves 3–7 per 72.8).

**No code, DB, ticket, or commit changes made in this audit.**
