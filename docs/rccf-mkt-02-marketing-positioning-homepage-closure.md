# RCCF-MKT-02 — Marketing Truth Fixes + Homepage Positioning & IA Implementation

## 1. Executive Verdict

**Classification: D — BLOCKED (HARD STOP, per ticket §29 #1).**

> *"STOP immediately if: Required successful test storefront screenshots cannot be found."*

The mandatory Phase 1 input — **real successful Razorpay test-mode storefront screenshots** — does not exist in the repository/worktree in a marketing-usable form. Every available candidate is either a 404/error capture or an internal QA tenant capture whose content (probe products, audit titles, mojibake) is unusable as product proof.

Per §29 (*"Report the blocker instead of improvising"*), implementation was **not started**. No source files were modified. Nothing was staged. The working tree remains byte-equivalent to the RCCF-MKT-02 baseline plus this closure document.

Unblock decision required from the ticket owner (see §8 Options).

---

## 2. Preflight Audit (Phase 0 — completed)

Baseline captured before any action:

| Check | Result |
|---|---|
| `git status --short` | 362 lines — 61 modified tracked files + extensive pre-existing untracked set (RCCF-70.x/71.x/72.x/73.x work). Untouched. |
| `git diff --stat` | 61 files changed, 1208 insertions(+), 580 deletions(-) |
| `git diff --cached --stat` | **empty — nothing staged at baseline** |
| Dev server | Reused healthy listener on port 3000 (HTTP 200 on `/`) |

Marketing architecture re-inspected (homepage composition, MarketingNav/Hero/HeroInput/Footer/Section/Pricing suite/trust kit, `lib/marketing/*` data, layout metadata, sitemap/robots) — consistent with `docs/rccf-mkt-01-marketing-frontend-audit.md`. All copy-truth defects from MKT-01 were reconfirmed and remain unfixed:

- `/features`: visible mojibake ("â€\"") in hero subhead, final CTA button, and metadata.
- `/about`: broken duplicated sentence ("…on CreatorStore.\ninto a real business."); unsupported "thousands of creators" claim in story.
- `/pricing`: title renders "Pricing — CreatorStore — CreatorStore"; metadata claims "from ₹999/month" while runtime Growth = ₹699/month; FAQ answer hardcodes ₹999/₹1,995 vs runtime ₹699/₹1,999.
- Homepage: 19 sections, ~6 repetitive icon grids; hero/OG use error-page screenshots.
- Blog UPI post contradicts payment architecture ("No third-party payment gateways" vs Razorpay); unsupported "90%" stat.
- Dead fabricated data still exported and reachable: `TESTIMONIALS`, `SOCIAL_PROOF_STATS` (`src/lib/marketing/*`).

---

## 3. Screenshot Audit (the blocking finding)

Method: enumerated every PNG under `screenshots/`, `docs/marketing-assets/`, `public/marketing-assets/`, `.playwright-mcp/`, `test-results/`, `playwright-report/`; inspected visual content of all plausible candidates by name, size class, and direct viewing; probed live tenants on the running server.

| Candidate | Size | Visual content | Usable? |
|---|---|---|---|
| `public/marketing-assets/storefront/01-desktop.png` / `02-mobile.png` | 21 KB / 17 KB | **404 "Creator Not Found" error page** | ❌ |
| `docs/marketing-assets/screenshots/storefront/01–05-*` | 16–18 KB each | Same 404 captures (verified `02-storefront-tablet.png`; size class identical for rest) | ❌ |
| `screenshots/rccf-71.5.1-growth-published-storefront.png` (+ `final-`, `-polished-` variants) | 186–259 KB | Tenant "**RCCF 71.5.1 Growth Test** — Creator Theme Experience QA" (internal QA banner content) | ❌ |
| `screenshots/rccf-72.1-storefront-a-desktop/-mobile.png`, `rccf72-13-G/Launch-storefront-unchanged.png` | 72–221 KB | Tenant "**RCCF 72.0 Audit**": products "RCCF721 Audit Product ₹500", "Audit CTA 999", mojibake hero glyph | ❌ |
| `/testcreator` (only live published tenant; captured fresh during audit) | 247 KB | Real storefront chrome, but content = QA probes: "RCCF D7.2 Test Product", "RCCF D7.2 Refund Probe C", `D75 "WA" & <Probe> 50% OFF`, mojibake hero | ❌ |
| `/snax` (original source of past marketing assets) | — | **404** — seeded tenant absent from current DB; `prisma/seed.ts` creates only a bare tenant + admin user (no website/products) | ❌ n/a |
| `.playwright-mcp/`, `test-results/`, `playwright-report/` | — | Only this session's audit captures; no historical storefront proof | ❌ |

**Conclusion:** zero successful, presentable Razorpay test-mode storefront screenshots exist in the worktree. Fabricating replacements, cropping QA-probe regions, or presenting internal-QA tenants as examples would each violate the ticket's truth rules (§2, §11, §14) — so per §29 the run stops here.

### Exact reference catalog for the eventual fix (all currently pointing at 404 assets)

| # | File:Line | Surface |
|---|---|---|
| 1 | `src/app/layout.tsx:44` | OpenGraph image (site-wide) |
| 2 | `src/app/layout.tsx:51` | Twitter card image (site-wide) |
| 3 | `src/components/marketing/Hero.tsx:73` | Homepage hero preview ("Your storefront, live") |
| 4 | `src/components/marketing/StorefrontShowcase.tsx:25` | Showcase desktop card |
| 5 | `src/components/marketing/StorefrontShowcase.tsx:37` | Showcase mobile card |

Replacement assets must land at `public/marketing-assets/storefront/` (same filenames keeps the diff minimal) or paths must be updated in exactly these five locations.

---

## 4. Asset Changes

**None performed** — blocked pending usable screenshots.

To be explicit for the record once unblocked: any screenshots used will be *successful Razorpay test-mode storefront captures presented as product examples* ("what you can build"), never as customer testimonials or production results.

---

## 5. Truth Fixes / Homepage IA / Implementation

**None performed** — Phases 2–9 are downstream of the Phase 1 asset fix (hero, showcase, and OG/Twitter are core to both the copy pass and the new homepage structure). Stopping before them avoids a half-implemented homepage that still showcases error pages.

The full implementation plan remains ready in `docs/rccf-mkt-01-marketing-frontend-audit.md` (§16–§20): D-skeleton/A-language/B-organs/C-growth synthesis, 19→~9 section map, priority matrix, and the three positioning answers ("Your presence. Your business.").

---

## 6. Verification Results

Not applicable to implementation gates (no code changed). State gates:

| Gate | Result |
|---|---|
| Source modifications | None |
| Staged changes | None (`git diff --cached --stat` empty before and after) |
| Database changes | None (no seed run, no tenant creation attempted) |
| Commits / pushes | None |
| Working tree vs baseline | Equivalent + this closure doc only |

---

## 7. Protected Work

Untouched by definition: the entire baseline (61 modified files, all untracked sets) is byte-preserved. Baseline snapshots saved outside the repo (`%TEMP%\opencode\mkt02-baseline-*.txt`) for post-unblock comparison.

---

## 8. Unblock Options (decision required)

1. **Supply assets** *(cleanest)* — drop successful Razorpay test-mode storefront captures into `public/marketing-assets/storefront/` (desktop ≥1440px wide, mobile 390×844-class). RCCF-MKT-02 then resumes at Phase 1 with zero ambiguity.
2. **Authorize demo-tenant creation** — permit signing up a fresh local creator account via the live dev product, onboarding → builder → publish a presentable example storefront (clearly example-branded, Razorpay test mode), then capturing desktop+mobile screenshots. This produces genuine product output but creates local DB records and needs explicit authorization because it exceeds "use what exists in the worktree".
3. **Authorize re-seeding + rebuilding `/snax`** — run `prisma/seed.ts`, build/publish the Snax tenant via the current flow, capture. Heavier than option 2; touches shared seed state.

Recommendation: **Option 1**, fallback Option 2.

---

## 9. Git

Commit: NOT CREATED
Push: NOT PERFORMED
Staged: NOTHING (nothing in scope was implemented)

**Status: STOPPED — awaiting screenshot assets or an authorization decision.**
