# RCCF-70.4.2 — Premium Creator OS Shared Presentation Primitives

## 1. Executive Verdict

**A — SAFE TO PROCEED**

Foundation-only presentation primitives were aligned with the Premium Creator
OS direction established in RCCF-70.4.1:

- **Button.tsx** now maps its four variants 1:1 onto the canonical `.btn-*`
  token classes (`btn-primary` / `btn-secondary` / `btn-ghost` / `btn-danger`),
  eliminating the legacy light-theme indigo/gray palette that sat outside the
  token system. One button presentation approach remains; semantics, click
  behavior, and the prop contract are unchanged.
- **Badge.tsx** is untouched in behavior; its variant union is now exported as
  `BadgeVariant` so presentation helpers reuse the canonical vocabulary.
- A single **product presentation helper** module adds three pure, deterministic
  helpers: `getProductTypeLabel`, `getCommerceModePresentation`,
  `getProductStatusPresentation` — all reusing canonical registries/enums.
- No surface (Dashboard/Products/Builder/Storefront/Hero) was restyled.
  Consumers of `Button` inherit the token treatment because every surface they
  live on is already dark-first; no consumer was edited.

This RCCF was strictly presentation-only. No frozen architecture was touched.

## 2. Files Changed

| File | Change |
|---|---|
| `src/components/ui/Button.tsx` | Variant map → canonical `.btn-*` classes; removed light-theme palette + redundant `rounded-md`/`shadow-sm`/`focus:ring-*`; kept sizes, disabled state, focus-visible base. |
| `src/components/ui/Badge.tsx` | Export `BadgeVariant` type; `BadgeProps.variant` typed with it. No visual/behavior change. |
| `src/features/products/presentation.ts` | **New** — pure presentation helpers (type label, commerce mode, status). |
| `tests/unit/rccf70-4-2-primitives.test.tsx` | **New** — 17 focused tests. |

No other files were modified for consistency's sake.

## 3. Button Reconciliation

**Before:** `Button.tsx` hard-coded a light theme — `bg-indigo-600`,
`bg-red-600`, `border-gray-300 bg-white`, `text-gray-700`, `hover:bg-gray-100`
— plus `rounded-md`, `shadow-sm`, and its own `focus:ring-2` stack. This
duplicated the token system (`--brand-primary`, `--brand-secondary`,
`--text-*`, `--border`) and rendered as light pills on dark surfaces.

**After:** variants map 1:1 to the canonical classes:

| Variant | Canonical class | Token behavior |
|---|---|---|
| `default` | `btn-primary` | `var(--brand-primary)` bg, `var(--on-primary)` text, hover `var(--primary-hover)` + restrained glow |
| `destructive` | `btn-danger` | semantic red-500/20 → red-400 |
| `outline` | `btn-secondary` | transparent + `--border`, `--text-primary`, hover border→brand |
| `ghost` | `btn-ghost` | transparent, `--text-secondary`, hover `--surface-base` |

- **Radius:** inherits `rounded-lg` (control radius) from `.btn-*`; the old
  `rounded-md` was removed — the CSS class owns radius now.
- **Elevation:** no `shadow-sm` (buttons stay flat; elevation belongs to
  cards/containers). Hover glow comes from `.btn-*` hover rules only.
- **Focus:** `focus:ring-*` utilities removed; the global `*:focus-visible`
  rule (`--focus-ring`) now provides the consistent ring — matching every
  other `.btn-*` button and the audit's a11y mapping.
- **Disabled:** `disabled:cursor-not-allowed disabled:opacity-50` retained in
  the base.
- **Semantics preserved:** `type`, `onClick`, `disabled`, `aria-*`, `size`,
  `className` pass-through are unchanged (covered by tests).

Consumers (SEO forms, billing managers, provisioning, super-admin generate,
contact form) required no edits — their surfaces are dark-first, so the token
classes are the correct presentation there.

## 4. Radius / Elevation

Audit result — **no token redefinition required**; existing tokens already
match the Premium Creator OS direction (RCCF-70.4.1 §9):

- Controls (`.btn-*`, `.admin-input`, `.admin-select`) → `rounded-lg` ✓
- Cards (`.admin-card`, `GlassCard`, `MetricCard`, `DataTable` wrapper) →
  `rounded-xl` ✓
- Larger containers (`rounded-2xl` admin dialogs/panels) ✓
- Badges (`Badge`, `.admin-badge`) → `rounded-full` pill ✓
- Elevation: `--shadow-elevation` on cards, `--shadow-elevation-hover` on
  hover, restrained flat dark aesthetic ✓

The only concrete control-radius defect was Button's `rounded-md`, resolved in
§3. No new colors or token families were introduced.

## 5. Product Type Labels

`getProductTypeLabel(type: ProductTypeId): string` in
`src/features/products/presentation.ts`:

- Uses `PRODUCT_TYPE_BY_ID` from the canonical registry
  (`src/modules/product-types/index.ts`). **No second registry.**
- `digital → "Digital Product"`, `physical → "Physical Product"`, `course →
  "Course"`, `booking → "Booking"` etc., straight from registry labels.
- Deterministic fallback for unknown/invalid ids → returns the raw id.
- Pure function: no DB, no server action, no capability lookup.
- `ProductTypeId` unchanged; Prisma/queries untouched.

Consumption in the Products admin table is deferred to RCCF-70.4.4 (this RCCF
is primitives-only).

## 6. Commerce Mode Presentation

The existing `Badge` primitive already expresses the required treatment via its
neutral variants — **no new `CommerceBadge` component** was introduced. A
`getCommerceModePresentation(mode)` helper returns `{ label, badgeVariant }`:

| Mode | Label | Badge variant |
|---|---|---|
| `ONLINE` | Online | `info` |
| `WHATSAPP` | WhatsApp | `cyan` |
| `BOTH` | Online + WhatsApp | `gold` |

- All three variants are distinct (never render identically — test-verified).
- Variants are deliberately **behavior-neutral** (info/cyan/gold carry no
  success/warning semantics), so a badge never implies different behavior.
- Unknown modes normalize to `ONLINE` via the canonical `normalizeCommerceMode`
  (tested). No `CASH`/`STRIPE`/`MANUAL`/new mode added.
- Commerce behavior stays exactly where it is today (renderers, actions,
  checkout — untouched).

## 7. Product Status Presentation

`getProductStatusPresentation(status)` maps the authoritative repository
vocabulary to semantic badge variants:

| Status | Label | Badge variant | Direction |
|---|---|---|---|
| `PUBLISHED` | Published | `success` | success presentation |
| `DRAFT` | Draft | `warning` | warning presentation |
| `ARCHIVED` | Archived | `default` | muted/neutral |

- Vocabulary is **not** renamed to Stitch's Active/Draft/Hidden.
- Unknown statuses fall back to a neutral `default` (tested).
- Underlying status values, filtering/query logic, and server behavior are
  unchanged.

## 8. Badge Preservation

- `Badge.tsx` behavior unchanged — only the variant union was extracted to an
  exported `BadgeVariant` type and reused by the helpers (Workstream 6). This
  is reuse, not duplication.
- `PublishStatusBadge` and `BillingStatusBadge` remain canonical and were
  **not** modified; their business logic is untouched.
- Storefront badges (renderers) untouched.
- Existing `Badge` rendering (pill + token-backed variant classes) is
  regression-tested (`rounded-full`, `bg-green-500/20`, `bg-zinc-800`).

## 9. Architecture Integrity

Verified during implementation and in the source-truth audit:

- No new server action. No Prisma/schema/migration/repository change.
- No query change. No capability logic. No billing logic. No publishing change.
- No Builder state/events/commands/query/persistence change.
- No Hero resolver / data-contract / Theme-Runtime change.
- No duplicate product-type registry, no new commerce mode, no hardcoded plan
  limits, no fabricated data.
- No surface redesign (Dashboard/Products/Builder/Storefront/Hero untouched).
- Badge variant export is additive and type-safe.

## 10. Tests

`tests/unit/rccf70-4-2-primitives.test.tsx` — 17 tests:

1. Button: default → `btn-primary`, no legacy `bg-indigo-600`
2. Button: destructive → `btn-danger`
3. Button: outline → `btn-secondary`
4. Button: ghost → `btn-ghost`
5. Button: size variants apply px/py/text utilities
6. Button: consistent disabled + focus-visible classes
7. Button: semantics preserved (`type`/`onClick` pass through, click works)
8. Product type label: digital/physical/course/booking
9. Product type label: derived solely from canonical registry
10. Product type label: deterministic unknown fallback
11. Commerce: all three immutable modes present
12. Commerce: distinct, behavior-neutral presentations per mode
13. Commerce: unknown normalizes to ONLINE
14. Status: PUBLISHED/DRAFT/ARCHIVED semantic mapping
15. Status: unknown falls back to neutral default
16. Badge: success variant renders pill + token classes
17. Badge: default variant unchanged

No tests require Prisma or a database.

## 11. Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ pass |
| `npm run build` | ✅ pass |
| `npx vitest run` | ✅ 213/214 files passed; 3214/3215 tests passed (1 failure in `rccf68-retry-catalog-timeout.test.ts` — a pre-existing 5000ms idempotency timeout under parallel load; passes in isolation ✅) |
| `npx vitest run` (this RCCF) | ✅ 17/17 |
| `npx vitest run product-module, payment-account` | ✅ 17/17 (regression) |
| `npx eslint` on all touched files | ✅ clean |
| `git diff --check` | ✅ no whitespace errors (only pre-existing CRLF notices) |

## 12. Files Frozen

Not modified (verified unchanged by this RCCF):

- Prisma schema/migrations, repositories, server actions (product/hero/publish)
- `publishWebsite()`, `getPublishFailurePresentation()`, publishing pipeline
- Builder state/store/events/commands/query/persistence
- `WebsiteAggregate`, `PublishedSnapshot`, `LayoutEngine`, `ComponentRenderer`,
  `ComponentRegistry`, section presentation contracts
- Hero resolver / `hero_data` contract / Theme Runtime
- `PRODUCT_TYPE_REGISTRY`, `COMMERCE_MODES`, capability/plan/billing modules

## 13. Remaining Findings

1. **Products admin table still renders raw type ids** and lacks the commerce
   column/filters — consumption of the new helpers lands in RCCF-70.4.4
   (Products surface), as scoped.
2. **Products form type `<select>`** still lists a mismatched subset
   (Digital/Physical/Service/Membership/Bundle) vs the canonical registry
   (7 types) — a Products-surface fix for RCCF-70.4.4, out of scope here.
3. **Badge `gold` duplicates `warning` styling** (`bg-amber-500/20
   text-amber-400`). Harmless; kept to avoid changing existing semantic states.
   Consider collapsing in a later cleanup RCCF.
4. **Super-admin/SEO surfaces** render the token buttons without further polish
   (correct classes, un-themed spacing) — acceptable; not part of the four
   canonical surfaces.
5. `.btn-*` hover glow uses a fallback `--color-focus` rgba indigo; consistent
   with the existing system, no action needed.

## 14. Recommendation for RCCF-70.4.3

Proceed to **RCCF-70.4.3 — Admin Dashboard visual implementation**
(presentation-only), now that shared primitives are canonical:

- Reuse `Badge`/`BadgeVariant`, `.btn-*`, token classes and the dashboard
  widget inventory from the RCCF-70.4.1 audit (§4). The audit established the
  repo dashboard is a superset of Stitch's — work is reorganization/polish,
  not new widgets.
- Quick-action parity ("Create Product", "Edit Appearance" tiles) is
  presentation-only; `StorefrontStatusCard` publishing UX stays canonical.
- Keep real server-derived metrics; never introduce fabricated analytics.
- If any 70.4.3 change requires a data/architecture touch, STOP and report
  (per the mission contract).

---

*RCCF-70.4.2 verdict: A — SAFE TO PROCEED. Strictly presentation-only; no
commit made; pre-existing uncommitted work untouched.*