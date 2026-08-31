# RCCF-70.6.2 — Admin Navigation RSC Serialization Closure

## 1. Executive Verdict

**A — SAFE TO PROCEED (staged, not committed).**

The P0 confirmed by the RCCF-70.6.1 audit — every `/admin/*` route 500s with
`Error: Unsupported Server Component type: forwardRef` because the Server layout
passed Lucide `forwardRef` icon components (`{$$typeof, render, displayName}`)
through the RSC boundary — is fixed by replacing component identity with a
plain-string `iconKey` wire contract while keeping all capability filtering
server-side.

- Server still decides **what** navigation shows (`filterNavForPlan`, canonical `NavConfig`).
- A new serializer `toNavWire` projects it into a **wire-safe** `NavConfigWire`
  containing only strings/booleans — zero functions, zero React objects.
- The client resolves **how** icons look via its own registry
  (`adminNavIconRegistry`) keyed by Lucide `displayName`, with a deterministic
  `Menu` fallback so an unknown key can never crash the admin shell.

Verified with `tsc`, the full 3155-test suite (210 files), `npm run build`,
ESLint, Prisma validate/generate, `git diff --check`, and a live `npm run dev`
runtime check: `GET /admin/login` now returns **200** with the login form (it
previously 500'd with digest `4189986675`), and unauthenticated `/admin/dashboard`
still redirects 307 → `/admin/login`.

Not committed (per mission rule). No schema change, no migration, no capability
matrix change.

---

## 2. Production Root Cause (from the RCCF-70.6.1 audit, confirmed)

- **Symptom:** every `/admin/*` page (including `/admin/login`) 500s with
  `Error: Unsupported Server Component type: forwardRef`, digest `4189986675`.
- **Root cause:** `src/app/admin/layout.tsx:58` passed
  `nav={visibleNav}` — a `NavConfig` whose items carry `icon: LucideIcon` —
  into the client component `AdminLayoutClient`. Lucide icons are created via
  `react.forwardRef`, so each is a plain object
  `{ $$typeof: Symbol(react.forward_ref), render, displayName }`. Next.js's
  RSC flight serializer rejects `$$typeof` from a non-RegisteredServerComponent.
- **First offending value:** `LayoutDashboard` at `src/config/admin-nav.ts:41`.
- **Introduced by:** commit `d09c593` (RCCF-67.4 capability-aware navigation).
- **Scope:** all `/admin/*` routes; `/signup` works (no admin layout).
- **Why CI missed it:** every admin route is dynamic (`ƒ`), so `next build`
  never renders the boundary and the error only surfaces at runtime.

---

## 3. RSC Serialization Mechanics

```
Server layout (RSC)                                    Client shell
──────────────────────────────────────────────────────────────────────
ADMIN_NAV (NavConfig)
   └─ icon: LucideIcon  ──────────❌ forwardRef object ($$typeof/render) ──► 500
       └─ "Unsupported Server Component type: forwardRef"

RCCF-70.6.2:
ADMIN_NAV (NavConfig, unchanged)            "use client"
   └─ iconKey: "LayoutDashboard" ──────────✅ plain string ────────────────► AdminSidebar
       (from icon.displayName)                                    └─ adminNavIconRegistry["LayoutDashboard"]
                                                                            └─ ✅ real <LayoutDashboard /> svg
```

The `nav` prop is serialized into the flight payload **before** the client
component runs, which is why `/admin/login` failed too — `AdminLayoutClient`'s
login short-circuit happens after prop deserialization would have thrown.

---

## 4. Architecture Invariant & Option Selection

**Invariant (unchanged):** the server owns *authority* (capability filtering,
plan resolution, `requiredCapability` gating); the client owns *presentation*
(how an icon is rendered). No client-side capability computation, no duplication
of the capability matrix, no `filterNavForPlan`/`capabilityService` on the client.

**Option A (selected) — icon-key wire contract.** The canonical
`ADMIN_NAV → filterNavForPlan` pipeline is untouched; a serializer strips
non-serializable `icon` values into `iconKey` strings. This is the minimal,
architecture-safe fix: one pure function, one client registry, a type-level
guardrail. Options B–D (send the raw config for the client to re-filter, flatten
to plain paths, or hardcode icons client-side) were rejected: B duplicates
capability authority client-side, C changes the sidebar rendering contract, and
D duplicates the icon mapping with no serialization story.

---

## 5. Wire Contract

`src/config/admin-nav.ts` (canonical types unchanged; wire types added):

```ts
export interface NavItemWire {
  href: string;
  label: string;
  iconKey: AdminNavIconKey;   // plain string, derived from Lucide displayName
  badge?: NavItem["badge"];
}
export interface NavGroupWire {
  label?: string;
  items: NavItemWire[];
  collapsible?: boolean;
}
export interface NavConfigWire {
  groups: NavGroupWire[];
  footer: NavItemWire[];
}
```

- **`AdminNavIconKey`** is a literal union over the `ADMIN_NAV_ICON_KEYS` const
  (34 entries — every icon actually used by `ADMIN_NAV`), with an
  `isAdminNavIconKey` guard.
- **Deliberately absent from the wire:** `icon`, `requiredCapability`,
  `requiredLimitAbove`. Capability metadata never crosses the boundary; the
  client cannot re-derive plan logic.
- **Every consumed field is preserved:** `href`, `label`, `badge`, group
  `label`/`items`/`collapsible`, `footer`.

---

## 6. Icon Registry & Fallback

`src/config/admin-nav-icons.ts` (new, `"use client"`):

```ts
export const adminNavIconRegistry = { LayoutDashboard, Wand2, ..., LogOut } as const;
export const FALLBACK_NAV_ICON: LucideIcon = Menu;
export function resolveAdminNavIcon(iconKey: string): LucideIcon {
  return adminNavIconRegistry[iconKey as keyof AdminNavIconRegistry] ?? FALLBACK_NAV_ICON;
}
```

- Keys are the Lucide `displayName` values (verified in
  `node_modules/lucide-react/dist/cjs/lucide-react.js`: every icon is created
  via `react.forwardRef` and `Component.displayName = toPascalCase(iconName)`),
  so `Image`/`Gamepad` aliased imports map correctly.
- Unknown/typo'd keys resolve to `Menu` deterministically — the admin shell can
  never crash from a presentation key.
- The registry is client-only; the server never imports it (it imports only the
  `isAdminNavIconKey` guard from the server module).

---

## 7. Implementation Changes

| File | Change |
|---|---|
| `src/config/admin-nav.ts` | Added `ADMIN_NAV_ICON_KEYS`, `AdminNavIconKey`, `isAdminNavIconKey`, `NavItemWire`/`NavGroupWire`/`NavConfigWire`. Canonical `NavItem`/`NavGroup`/`NavConfig`/`ADMIN_NAV`/`findNavItem` untouched. |
| `src/lib/capabilities/nav-visibility.ts` | Added `toNavWire(config)` + internal `iconKeyOf` (displayName-based, deterministic `Menu` fallback). `filterNavForPlan`/`isNavItemVisible` unchanged — still return canonical `NavConfig`. |
| `src/config/admin-nav-icons.ts` | **New** client icon registry + `resolveAdminNavIcon` + `FALLBACK_NAV_ICON`. |
| `src/config/index.ts` | Re-exported the wire types (type-only). |
| `src/app/admin/layout.tsx` | Line 30/58: `nav={toNavWire(filterNavForPlan(ADMIN_NAV, planCode))}` + explanatory comment. |
| `src/app/admin/_components/admin-layout-client.tsx` | `nav: NavConfigWire` (was `NavConfig`). |
| `src/app/admin/_components/admin-sidebar.tsx` | `nav: NavConfigWire`; `isGroupActive`/`isGroupCollapsed` take `NavGroupWire`; icon render `const Icon = resolveAdminNavIcon(item.iconKey)`. Footer `ExternalLink`/`LogOut` remain hardcoded client-side (never crossed the boundary). |
| `tests/unit/rccf68-admin-responsive.test.tsx` | `TEST_NAV` migrated from `NavConfig` (`icon: (() => null) as never`) to `NavConfigWire` (`iconKey`). |
| `tests/unit/rccf70-6-2-nav-serialization.test.tsx` | **New** regression suite (see §9). |

---

## 8. Behavior Preservation

- **Capability filtering:** identical — `filterNavForPlan` is the only source of
  what renders; `toNavWire` maps 1:1 from its output. The capability-surface
  suite (`rccf67-capability-surface.test.ts`) is green unchanged.
- **Sidebar rendering:** same labels, hrefs, badges, collapsible groups, active
  state, `aria-current`, mobile drawer/a11y (Escape, focus trap, scroll lock).
  Icons now render real `<svg>` elements instead of no-op stubs in tests.
- **Login short-circuit:** `AdminLayoutClient` still renders the bare shell on
  `/admin/login` — but now the payload reaches it (previously the serialization
  threw first).
- **Server/client split:** client components import no capability code; the
  architecture-preservation tests (sidebar contains no `filterNavForPlan` /
  `capabilityService`, keeps `nav.groups.map`) remain green.

---

## 9. Regression Coverage

`tests/unit/rccf70-6-2-nav-serialization.test.tsx` (7 assertions across 6 tests):

1. **Deep-serializability** — `toNavWire(filterNavForPlan(ADMIN_NAV, "creator_enterprise"))`
   survives a recursive scan for functions/`$$typeof` and round-trips through
   `JSON.parse(JSON.stringify(...))`.
2. **Registry completeness** — every `iconKey` emitted by the unfiltered
   superset `ADMIN_NAV` exists in `adminNavIconRegistry`; every
   `ADMIN_NAV_ICON_KEYS` entry is present.
3. **Capability preservation + zero leakage** — wire hrefs exactly equal the
   canonical filtered hrefs; `/admin/bookings` hidden on Launch; no
   `requiredCapability`/`requiredLimitAbove` on any wire item.
4. **Wire rendering** — real `AdminSidebar` render: labels, hrefs,
   `aria-current="page"`, `<svg>` icons resolved from the registry, pending badge.
5. **Fallback safety** — unknown `iconKey` renders without throwing and resolves
   to `FALLBACK_NAV_ICON`.
6. **Source guardrails** — wire interfaces contain `iconKey` and no `icon:`;
   no `requiredCapability`/`requiredLimitAbove`; `layout.tsx` uses `toNavWire`;
   `admin-layout-client.tsx`/`admin-sidebar.tsx` consume `NavConfigWire` only;
   sidebar keeps `nav.groups.map` and drops `item.icon`.

Plus the migrated `rccf68-admin-responsive.test.tsx` (wire-shaped `TEST_NAV`,
7 sidebar/a11y tests still green).

---

## 10. Verification Results

| Check | Result |
|---|---|
| `npx tsc --noEmit` | ✅ clean |
| `npx vitest run` (full) | ✅ 210 files / **3155** tests passed |
| Focused (`rccf70-6-2` + `rccf68-admin-responsive` + `rccf67-capability-surface`) | ✅ 56 passed |
| `npm run build` | ✅ production build completes (all `/admin/*` dynamic as expected) |
| `npx prisma validate` | ✅ schema valid |
| `npx prisma generate` | ✅ regenerated |
| `npx eslint` (all 9 touched files) | ✅ clean |
| `git diff --check` | ✅ no whitespace errors (one benign CRLF→LF normalization warning) |
| Runtime `npm run dev` — `GET /admin/login` | ✅ **200**, login form rendered, **no** `Unsupported Server Component type`, **no** digest `4189986675` |
| Runtime — `GET /admin/dashboard` (no session) | ✅ 307 → `/admin/login` (middleware intact) |

---

## 11. Production Deploy Verification

**Unverifiable from this environment** (no Vercel access). The root cause was a
runtime-only RSC serialization failure; a stale production deploy running
pre-`d09c593` or pre-this-fix code would still exhibit it. After merge + deploy,
confirm manually: open any `/admin/*` URL while signed in and confirm the sidebar
renders with icons and no error page. The `digest 4189986675` error is gone when
the fix is live.

---

## 12. Diff Discipline

- **70.6.2 scope only:** 7 source files + 1 new registry file + 2 test files.
- **Untouched (pre-existing working-tree state left as-is):** `settings-form.tsx`,
  `settings-live-preview.tsx`, `renderers.tsx`, `website-aggregate.service.ts`
  (RCCF-70.5.2 work), the 70.5.2/70.5.3 audit+closure docs, and the stray `8000`
  file.
- **Explicitly out of scope (frozen surfaces):** `src/lib/auth`, next-auth
  config, `src/middleware.ts`, tenant resolution, Prisma schema/migrations,
  `capabilityService`, billing/plan-source/checkout/Razorpay/WhatsApp, affiliate,
  booking, media/storage, publishing, Builder/LayoutEngine/renderer data flow,
  storefront, Stitch, theme runtime.
- **No commit** was made (mission rule).

---

## 13. Risks & Edge Cases

- **Registry drift:** if a future nav item adds a Lucide icon not in
  `ADMIN_NAV_ICON_KEYS`/`adminNavIconRegistry`, the server falls back to `Menu`
  (safe, never a 500) and tests #2 catches the gap at CI time.
- **Aliased icons:** `Image`/`Gamepad` are keyed by their Lucide `displayName`
  ("Image"/"Gamepad"), not the import alias — verified by the registry
  completeness test running against the unfiltered `ADMIN_NAV`.
- **Multi-user/RSC caching:** the wire is deterministic (pure function of the
  canonical config), so cached flight payloads stay consistent across tenants.
- **No behavior change risk:** filtering, hrefs, badges, drawer behavior, and the
  capability architecture are untouched; every assertion that exercised them
  still passes.

---

## 14. Recommendation

**Staged. Proceed** to commit the 9 in-scope files (7 source + 1 new registry +
2 tests, excluding the unrelated 70.5.2 files) when the user requests it, then
deploy and confirm one signed-in `/admin/*` page in production to fully close
the RCCF-70.6 series. The capability/plan architecture was not modified, so no
schema or migration is required.