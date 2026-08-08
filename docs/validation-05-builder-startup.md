# RCCF-VALIDATION-05 — Builder Startup & Infinite Loading

**Status:** Launch blocker — **RESOLVED**. Root cause verified, minimal fix applied.

## 1. Startup sequence diagram

```
/builder (page.tsx)
  → BuilderLoader (loader.tsx)                     [ssr:false]
       → next/dynamic("./workspace")  ── WAS NEVER RENDERED (bug) ──
       → BuilderWorkspace (workspace.tsx)
            loading=true → effect[]
              ├─ loadBuilderPages()   → BuilderService.load (DB)
              ├─ getPublishStatus()
              ├─ getBuilderOverview() → contentCounts/plan/theme
              └─ setLoading(false)  ── only exit for the full-screen spinner
            → BuilderSidebar (SectionManager) · InteractiveCanvas
                 └─ getLivePreviewData() → WebsiteAggregate.build()
                 └─ layoutEngine.resolve(snapshot)
```

## 2. Startup timing breakdown (reproduced against production DB)

| Step | Duration (measured) |
| --- | --- |
| tenant lookup (cold) | 1393 ms |
| website lookup | 143 ms |
| `builderService.load` (pages+sections+blocks) | 417 ms |
| overview product/gallery counts | ~130 ms each |
| `websiteAggregate.buildWithDiagnostics` (full aggregate) | 1060 ms |

All startup server work **completes quickly**. No server hang, no slow query, no
DB timeout. This rules out every server-side cause.

## 3. Root cause (verified)

`src/features/builder/components/loader.tsx` was changed in commit
`20ad721` (RCCF-LAUNCH-TRACK-01, "builder loading fallback"):

```diff
 export default function BuilderLoader() {
-  return <BuilderWorkspace />;
+  return (
+    <div className="flex min-h-screen items-center justify-center ...">
+      <div className="text-center">…spinner…</div>
+    </div>
+  );
 }
```

The `next/dynamic` `BuilderWorkspace` component is still declared at the top of
the file but **never rendered** in the JSX. Consequences, both guaranteed:

1. `/builder` renders the spinner **only** — the workspace never mounts.
2. Because `next/dynamic` only fetches the workspace chunk when the component is
   rendered, the workspace module isn't even loaded in the browser.

Therefore the workspace's startup effect (`loadBuilderPages().then(→ setLoading(false))`)
never runs, and the loading screen persists **indefinitely for every user**.

## 4. Evidence

- `git log -p -- loader.tsx`: the exact regression diff above (commit `20ad721`).
- Node module-eval test of the full builder client graph (store, commands,
  persistence, registry, resolver-new, layout-engine, section-presentation,
  theme experience, section-manager, sidebar, website-panel, theme-card,
  interactive-canvas, workspace): **all evaluate cleanly** → no client
  module-eval crash (excludes a bundle/hydration import failure).
- Direct reproduction of every startup server action against the production
  Supabase DB: all resolve in < 1.5 s (see §2) → no server hang.
- `BuilderLoader`'s JSX provably contains no `<BuilderWorkspace />` reference.

## 5. Fix (minimal, no redesign)

`loader.tsx` now renders the workspace and keeps the spinner as the
`next/dynamic` loading fallback:

```tsx
const BuilderWorkspace = dynamic(
  () => import("./workspace").then((m) => m.BuilderWorkspace),
  { ssr: false, loading: () => ( /* spinner */ ) }
);
export default function BuilderLoader() {
  return <BuilderWorkspace />;
}
```

The workspace mounts, runs its startup effect, and drives its own
`loading` state to completion. The spinner remains only while the dynamic chunk
loads — preserving the original "no blank screen" intent of the TRACK-01 change.

## 6. Regression analysis

- The fix restores the exact pre-`20ad721` behavior (render `<BuilderWorkspace />`),
  so the builder behaves as it did before the regression.
- `next/dynamic` `loading` prop is standard; the workspace already renders its own
  "Loading your editor…" screen while `loading` is true, so the visual is seamless.
- No timeouts, no retries, no disabled features, no runtime/aggregate/store
  changes.
- Only `loader.tsx` changed; the workspace, store, aggregate, layout engine and
  all runtimes are untouched.

## 7. Performance analysis

- Workspace mount → `loadBuilderPages` (~0.5 s) → aggregate for the canvas
  (~1.1 s, already cached/parallel). Within launch targets.
- No extra queries added. The loader adds no requests.

## 8. Future risks

- The loader pattern (import `next/dynamic` component, render it) is now
  explicit; a future "loading fallback" edit must not drop the render.
- Recommend a smoke test that asserts `/builder` mounts the workspace
  (`data-testid="builder-canvas"` present) to prevent silent regressions of the
  same class.

## 9. Verification

- `npx tsc --noEmit` — clean.
- `npm run lint` — no new issues.
- `npm run build` — succeeds.
- `npx vitest run` — **2087/2087** pass.
- `/builder` route compiles and serves on the dev server (auth-gated as before).

## 10. Launch readiness update

Builder startup is unblocked. The infinite loading was a single-component render
bug (workspace never mounted), not a runtime/DB/deployment failure. No further
changes required to the startup pipeline. Sidebar-count work (RCCF-AUDIT-09)
remains separate and was not started, per the audit rule.
