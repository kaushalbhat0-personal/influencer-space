# Stitch-DNA — Creator-Store Design Mapping Artifact

**RCCF:** 70.2 — Stitch Design-System Bootstrap & Canonical Screen Generation
**Status:** COMPLETE — design system CREATED (platform-evolved, +2 auto-generated alternates); canonical screen set CREATED and truth-validated (RCCF-70.3)
**Date:** 2026-08-15 (updated 2026-08-16)

---

## 1. Purpose

Stitch is the **visual source of truth** for the Creator platform presentation phase.
The repository architecture remains authoritative for behavior, data, and security.

This document records:

- the Stitch design system created in the `Creator-Store` Stitch project,
- the deterministic mapping between Stitch design tokens/components/screens and the
  existing repository design-token architecture,
- the exact state of the canonical screen set,
- the frozen architecture boundaries Stitch must never cross.

The existing repository was NOT modified by this RCCF (only this file was added).
Stitch does not replace, own, or bypass any application architecture.

---

## 2. Stitch Project

| Field | Value |
|---|---|
| Project name | `projects/11634137981023354897` |
| Title | Creator-Store |
| Type | `TEXT_TO_UI_PRO` |
| Origin | STITCH |
| Visibility | PRIVATE |
| Owner role | OWNER |
| Created | 2026-08-15T12:41:13Z |
| Updated | 2026-08-15T12:41:29Z (pre-bootstrap) |
| Screens at bootstrap start | 0 |
| Design systems at bootstrap start | 0 |

---

## 3. Stitch Design System

| Field | Value |
|---|---|
| Asset ID | `assets/1738427339068984141` |
| Display name | **Premium Creator OS** (seeded as "Creator Store Premium"; platform-evolved to v2 during the session) |
| Version | 2 |
| Mode | DARK |
| Roundness | `ROUND_EIGHT` |
| Color variant | `TONAL_SPOT` |
| Headline font | Inter |
| Body font | Inter |
| Label font | Inter |
| Seed color | `#6366F1` |
| Primary override | `#6366F1` |
| Secondary override | `#8B5CF6` |
| Tertiary override | `#F59E0B` |
| Neutral override | `#18181B` (platform recorded `#0A0A0B` on its resolved theme) |

The platform expanded the seed into a full dynamic token set (named colors, Inter
typography scale — headline 32px/700, body 14px/400, label 12px/500 — rounded
sm→full, 4px spacing with 16px gutters and 24px margins). The overrides
(indigo/violet/amber) and the embedded "Premium Creator Operating System" design MD
are preserved in the resolved theme.

### Unintended platform-generated artifacts

During the design-system session the platform **auto-generated two additional
design systems** that were NOT created by this RCCF:

| Asset ID | Display name | Version | Status |
|---|---|---|---|
| `assets/8e940d67816e4fd4b50539e76d59690f` | Forge Creator OS | 1 | Not intended; platform-generated variant |
| `assets/99423ae8a5274ba7bc906937620781f8` | Forge Creator OS | 1 | Not intended; platform-generated variant |

These are the platform's own generated alternates. The Stitch MCP server exposes no
design-system deletion tool, so they cannot be removed from here; they should be
ignored (or deleted via the Stitch UI) and are NOT part of the Creator-Store design
language. The canonical design system for all future work is
`assets/1738427339068984141` (Premium Creator OS).

Design MD (embedded in the design system) codifies the **"Premium Creator Operating
System"** direction: dark-first, high-information-density, Inter typography, 4px
spacing rhythm, controlled accent color, minimal gradients/glass/rounding.

---

## 4. Design Tokens

| Stitch Token | Value | Existing Repository Token | Mapping Status |
|---|---|---|---|
| background/root | `#0A0A0B` | `--surface-root` (globals.css:10) | 1:1 MATCH |
| background/base | `#18181B` | `--surface-base` / `--surface-card` (globals.css:11-12) | 1:1 MATCH |
| background/card | `#18181B` | `--surface-card` (globals.css:12) | 1:1 MATCH |
| background/raised | `#27272A` | `--surface-raised` / `--surface-card-hover` (globals.css:13,21) | 1:1 MATCH |
| background/overlay | `#3F3F46` | `--surface-overlay` (globals.css:22) | 1:1 MATCH |
| primary | `#6366F1` | `--brand-primary` / `tailwind brand.primary` (globals.css:25) | 1:1 MATCH |
| primary-hover | `#4F46E5` | `--primary-hover` (globals.css:19) | 1:1 MATCH |
| secondary | `#8B5CF6` | `--brand-secondary` (globals.css:26) | 1:1 MATCH |
| accent | `#F59E0B` | `--brand-accent` (globals.css:27) | 1:1 MATCH |
| success | `#22C55E` | `--color-success` (globals.css:29) | 1:1 MATCH |
| warning | `#F59E0B` | `--color-warning` (globals.css:30) | 1:1 MATCH |
| danger | `#EF4444` | `--color-danger` (globals.css:31) | 1:1 MATCH |
| info | `#3B82F6` | `--color-info` (globals.css:32) | 1:1 MATCH |
| text-primary | `#FAFAFA` | `--text-primary` (globals.css:15) | 1:1 MATCH |
| text-secondary | `#A1A1AA` | `--text-secondary` (globals.css:16) | 1:1 MATCH |
| text-muted | `#71717A` | `--text-muted` (globals.css:17) | 1:1 MATCH |
| border | `rgba(255,255,255,0.08)` | `--border` (globals.css:14) | 1:1 MATCH |
| focus | primary-based ring | `--focus-ring` / `--color-focus` (globals.css:50) | 1:1 MATCH |

### Typography

| Stitch Token | Value | Existing Repository Token | Mapping Status |
|---|---|---|---|
| body | Inter 400/500 | `font-family: Inter` (globals.css:1,182) | 1:1 MATCH |
| heading | Inter 600/700 | `font-display` → Inter (tailwind.config.ts:86) | 1:1 MATCH |
| display | Inter 700/800 | Inter (tailwind.config.ts:86) | 1:1 MATCH |
| label | Inter 500/600 semibold, small | `.admin-table th` / `.admin-badge` text-xs | CONSISTENT |
| caption | Inter 400, `text-xs` | `text-zinc-400/500` utilities | CONSISTENT |
| mono | JetBrains Mono | `font-mono` → JetBrains Mono (tailwind.config.ts:87) | 1:1 MATCH |

**Decision (documented):** Inter is canonical. The repository currently loads a Geist
variable font (`next/font`) but the actual rendered body typography is Google Inter.
Stitch uses Inter; the Geist variable is a latent inconsistency to resolve in a
future restyle RCCF, not silently swapped now.

### Spacing

| Stitch Token | Value | Existing Repository Token | Mapping Status |
|---|---|---|---|
| spacing | 4px rhythm (4/8/12/16/20/24…) | Tailwind default 4px scale | 1:1 MATCH |

### Shape / Radius

| Stitch Token | Value | Existing Repository Token | Mapping Status |
|---|---|---|---|
| radius-sm | 0.25rem | `--radius-sm` (globals.css:34) | 1:1 MATCH |
| radius-md | 0.5rem | `--radius-md` (globals.css:35) | 1:1 MATCH |
| radius-lg | 0.75rem | `--radius-lg` (globals.css:36) | 1:1 MATCH |
| radius-xl | 1rem | `--radius-xl` (globals.css:37) | 1:1 MATCH |
| radius-2xl | 1.5rem | `--radius-2xl` (globals.css:38) | 1:1 MATCH |
| pill | full | badges `.admin-badge rounded-full` | 1:1 MATCH |

**Intended direction (documented, not yet globally applied):** controls md/lg,
cards xl, large containers 2xl, badges/status full. The repository is not yet fully
consistent (e.g. `ui/Button.tsx` uses `rounded-md`, DS-5 in design-system-audit.md);
the Stitch design system encodes the target direction.

### Elevation

| Stitch Token | Value | Existing Repository Token | Mapping Status |
|---|---|---|---|
| elevation | subtle dark shadow | `--shadow-elevation` / `--shadow-elevation-hover` (globals.css:47-48) | 1:1 MATCH |
| glass/surface | controlled only | `.xp-surface-glass`, `.xp-card-*` (globals.css:104-161) | PRESENT, used sparingly |

---

## 5. Component Mapping

| Stitch Component | Repository Component | Notes |
|---|---|---|
| Button (primary/secondary/ghost/danger) | `src/components/ui/Button.tsx`; `.btn-primary` / `.btn-secondary` / `.btn-ghost` / `.btn-danger` (globals.css) | Stitch = visual intent only |
| Input | `src/components/ui/Input.tsx`; `.admin-input` (globals.css:324) | — |
| Select | `.admin-select` (globals.css:339) | — |
| Card | `src/components/ui/Card.tsx`, `GlassCard.tsx`; `.admin-card` (globals.css:190) | — |
| MetricCard | `src/components/data/MetricCard.tsx` | Stitch dashboard metric reference |
| Badge | `src/components/ui/Badge.tsx`; `.admin-badge-*` (globals.css:240-258) | — |
| Table | `src/components/ui/Table.tsx`; `.admin-table` (globals.css:205) | — |
| Tabs | ad-hoc (3 impls) — no canonical primitive (DS-3) | future primitive RCCF |
| Dialog / Drawer | `src/components/admin/EditEntityDrawer.tsx`; ad-hoc modals (DS-3) | future primitive RCCF |
| Toast | ad-hoc (4 impls) — no canonical primitive (DS-3) | future primitive RCCF |
| EmptyState | `src/components/ui/EmptyState.tsx` | — |
| Loading / Skeleton | `src/components/ui/LoadingSpinner.tsx` | no Skeleton primitive yet (DS-3) |
| PageHeader | `src/components/layout/PageHeader.tsx` | — |
| Sidebar | `src/app/admin/_components/admin-sidebar.tsx` | — |
| Navigation | `src/config/admin-nav.ts`; `src/components/storefront/StorefrontNav.tsx` | — |
| BottomSheet | `src/features/builder/components/mobile-panel.tsx` | Builder mobile |
| Status indicator | `src/components/publish/PublishStatusBadge.tsx`, `BillingStatusBadge.tsx` | — |

---

## 6. Screen Mapping

**Status note:** All four canonical screens now exist in Stitch (created and
truth-validated under RCCF-70.3, 2026-08-16). Real server screen IDs are
recorded below. Duplicate generation attempts and the non-canonical residue
screens are catalogued in the RCCF-70.3 report (§5, §11).

| Stitch Screen | Repository Route | Repository Component | Stitch Screen ID |
|---|---|---|---|
| Creator Dashboard | `/admin/dashboard` | dashboard features, `DashboardWidget`, `MetricCard`, `BusinessHealthHero` | `ab7028fa9f924830b7a623089f8e0789` |
| Creator Products / CRUD | `/admin/products` | `src/features/products/`, `products-page.tsx`, `EditEntityDrawer`, `CrudTable` | `316007766d09424ea5c3899ad6089da9` |
| Creator Builder | `/builder` | `src/features/builder/components/` (`workspace.tsx`, `toolbar.tsx`, `sidebar.tsx`, `properties.tsx`, `mobile-panel.tsx`, `InteractiveCanvas`) | `8f47c0820077419eadccfca5c9cf195a` |
| Creator Storefront | `/[domain]` | `src/components/storefront/StorefrontPage.tsx`, `src/lib/registry/components/renderers.tsx` | `a11fd81adf414039a37b6fe351e7a1f2` |

**Rejected / non-canonical screens (must NOT be used as visual direction):**

- `735f886cd48c4800b260172af1f5ea16` "Premium Creator OS - Dashboard" — contains
  fabricated business data (Revenue `$42,920.50`, Total Orders `1,284`, Order
  `#9021`, storage `82% 4.1TB/5TB`); rejected and regenerated.
- `52c5009f5b1c4ffba72994f3d0ca9f7f` "Your Studio - Dashboard Overview" — clean
  of analytics but contains an unsupported "Stripe integration" help-text
  reference (the repository uses Razorpay); not selected.
- Four pre-existing "Creator Admin Dashboard" residue screens
  (`10c052f5f81b453bbca74c3c2bca8a43`, `ea0706b18dad4392a2caba2965f62e4f`,
  `9e2e4d1b23d44411893533ab85459fc4`, `c0758b55ae4f455d922ab3fdf4eda4f8`) from
  RCCF-70.2 timed-out attempts — fabricated commerce data, non-canonical.

Platform auto-generated responsive pairs exist for Builder Mobile
(`921e065c4e344f63a0e0877b1432664f`) and Storefront Mobile
(`0facf59ffd064567a6104ee93d8fdabb`); these are responsive variants of the
canonical screens, not additional screens.

### Commerce truth for the storefront screen

Supported sales modes (from `src/config/commerce/commerce-mode.ts`, RCCF-66.2):

- `ONLINE` — Buy Now (checkout)
- `WHATSAPP` — Order on WhatsApp
- `BOTH` — both actions

No other payment methods are invented. WhatsApp commerce renders only where it
naturally belongs (products configured with a WhatsApp sales mode).

### Forbidden storefront content (must never appear in a Stitch screen)

- visitor analytics / traffic / conversion rate (dashboard OR storefront)
- AI-generated insights
- fake Instagram feed (the repository renders real content only; Instagram is not a
  fake feed — RCCF-67.4)
- fake course purchasing / memberships / payment states
- any capability not present in the repository

---

## 7. Responsive Mapping

| Context | Stitch intent | Repository architecture |
|---|---|---|
| Mobile | 320 / 375 / 390 | verified zero-overflow (RCCF-RESPONSIVE-01) |
| Mobile-large | 390 | verified |
| Tablet | 768 | verified |
| Desktop | 1024 | verified |
| Large desktop | 1280+ | verified |
| Wide | 1440+ | verified |
| Admin | responsive drawer sidebar | `admin-sidebar.tsx` mobile drawer + focus trap |
| Builder | Sections/Properties become bottom sheets | `mobile-panel.tsx`, `hidden lg:block` rails |
| Storefront | container-query breakpoints | `@container/main` + `@sm/main:`/`@lg/main:` (RCCF-RESPONSIVE-02/03); Builder device frames 375/768/1200 |

Stitch must not introduce conflicting breakpoints. The repository's existing
breakpoint model is canonical.

---

## 8. Intentional Differences

Documented Stitch design decisions that intentionally differ from (or refine) the
current repository presentation — none change architecture:

1. **Inter is canonical** — resolve the Geist variable-font inconsistency (DS-7)
   in a future restyle RCCF by removing the unused Geist load, keeping Inter.
2. **Radius direction** — controls md/lg, cards xl, containers 2xl, badges full.
   The repository is not yet globally consistent (DS-5); Stitch encodes the target.
3. **Elevation restraint** — subtle dark elevation as the default; glass/luxury
   experience surfaces remain reserved for the storefront experience layer, not the
   admin shell.
4. **Information density** — hierarchy via spacing + typography + controlled accent,
   not decorative gradients. This is a refinement of existing `.admin-*` components,
   not a redesign of structure.
5. **Button consolidation direction (DS-1)** — one primary variant per surface,
   marketing retains its single gradient primary.

---

## 9. Frozen Architecture

Stitch does NOT own and must NEVER bypass:

- data (Prisma schema, migrations, repositories)
- authentication / session architecture
- tenant resolution (`requireTenant`, `requireAuth`, middleware derivation)
- capabilities (`capabilityService`, plan configuration, `ResolvedPlan`, nav gating)
- billing / subscriptions / pricing / storage quotas (incl. hero enforcement)
- checkout / Razorpay / webhook reconciliation / payment account
- WhatsApp commerce / affiliate commerce / bookings / services
- commission / settlement / payouts / fulfillment
- media authorization / asset lifecycle
- publishing pipeline / publish authority
- Builder state/actions/persistence (`builderStore`, `builderEvents`,
  `builderCommands`, `builderQuery`, `builderPersistence`, `BuilderService`)
- `WebsiteAggregate`, `PublishedSnapshot`, `LayoutEngine`, `DataBoundRenderer`,
  `ComponentRenderer` / `ComponentRegistry` data flow
- section-presentation contracts
- Theme Runtime authority (`ThemeDefinition → ThemeResolver → LayoutEngine`)

Stitch controls **visual/design intent only**.

---

## 10. Current Screen Bootstrap Status (HONEST STATE)

The Stitch design system was created successfully
(`assets/1738427339068984141`, evolved to "Premium Creator OS" v2). Two extra
auto-generated "Forge Creator OS" design systems exist as platform artifacts
(see §3) and are not part of the canonical design language.

**RCCF-70.2 screen generation was BLOCKED** by the Stitch MCP timeout
(`MCP error -32001: Request timed out`); no screens were fabricated then.

**RCCF-70.3 (2026-08-16) generated and validated all four canonical screens.**
Observed Stitch MCP behavior: a `generate_screen_from_text` call that times out
at the MCP layer frequently **completes server-side minutes later**; the reliable
pattern was to wait ~2–5 minutes after a timeout and poll
`stitch_list_screens`/`stitch_get_project` rather than retry immediately.
"Invalid argument" rejections create no screen and may be transient. Because the
Stitch MCP server exposes no deletion tool, non-canonical and duplicate screens
remain in the project and are catalogued in §6 and the RCCF-70.3 report.

Canonical screens (real IDs): Dashboard `ab7028fa9f924830b7a623089f8e0789`,
Products `316007766d09424ea5c3899ad6089da9`, Builder
`8f47c0820077419eadccfca5c9cf195a`, Storefront
`a11fd81adf414039a37b6fe351e7a1f2`. Full attempt logs, truth audit, and the
rejected fabricated-data Dashboard are documented in
`docs/rccf-70.3-stitch-screen-generation-validation.md`.

This file therefore records:

- the durable design-system asset (retained across retries),
- the complete token/component/screen mapping (now backed by real screens), and
- the exact state of the canonical screen set.

---

## 11. Future Restyle Rules

Future RCCF implementation (RCCF-70.3+) MAY modify:

- presentation JSX
- CSS classes / Tailwind usage
- design tokens (globals.css, tailwind.config.ts)
- UI primitives (`src/components/ui/*`)

Future RCCF implementation MUST preserve:

- server actions (`src/actions/*`)
- data contracts (`src/types/*`, Prisma schema)
- authorization & tenant boundaries (`src/lib/auth`, `src/lib/tenant`,
  `src/middleware.ts`)
- capabilities (`src/lib/capabilities/*`)
- Builder state/actions/persistence
- publishing pipeline
- storefront data pipeline (`LayoutEngine` → renderers)
- Theme Runtime authority

---

*End of Stitch-DNA.md — RCCF-70.2, updated by RCCF-70.3*