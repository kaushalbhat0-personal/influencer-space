# Theme Runtime Compatibility Report — IMPLEMENTATION-25

## One runtime, unchanged

Every one of the 50 themes flows through the **same** existing pipeline:

```
themeRegistry.getAll() / getById
  → themeResolver.resolveForSnapshot(themeId, "dark", overrides)
  → ThemeSnapshot (colors + typography)
  → buildRuntimeSnapshot → LayoutEngine.resolve
  → LayoutEngine.buildTheme() → CSS vars (--surface-card, --text-primary, …)
  → Builder device frame  ==  Storefront <main>  (identical vars)
  → all renderers consume the vars
```

Nothing about the runtime, tokens, CSS variables, provider or resolver was
changed or duplicated. Applying a theme still uses the single
`applyThemePackage(tenantId, themeId)` action → `Website.themePackageId` →
the same runtime on the next render.

## Compatibility guarantees

- **Builder preview == Storefront** — both resolve the identical theme object
  (verified by IMPLEMENTATION-24's N2 and by P-tests after apply).
- **Publish parity** — publishing uses the same snapshot/theme path.
- **Backward compatible** — existing 30 themes unchanged (tier is additive via
  the `THEME_TIER_BY_ID` map; `premium`/`featured` semantics preserved).
- **Theme switching** — picking any theme (free or premium) updates the runtime
  theme immediately via the shared pipeline.

## Verified

- 50 themes register without duplicate id/slug errors.
- P3: applying an unlocked theme updates the current theme; the storefront +
  builder keep rendering via the same runtime (previous implementations N1–N3).
- No duplicated engines/providers/token systems were introduced.
