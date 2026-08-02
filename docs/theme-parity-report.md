# Theme Parity Report — IMPLEMENTATION-24

## Builder == Storefront

The Builder live preview and the published Storefront consume the **exact same
runtime theme object**:

- Both build the snapshot through `themeResolver.resolveForSnapshot` →
  `buildRuntimeSnapshot` → `LayoutEngine.resolve`.
- `LayoutEngine.buildTheme()` produces the CSS variable map.
- **Storefront**: `<main style={theme}>` applies the vars.
- **Builder**: the device frame now applies the same vars
  (`...(doc.theme as React.CSSProperties)`). Previously the builder frame was
  hardcoded `bg-zinc-950` and never applied the theme — a real divergence.

## Proof (computed styles)

Local + production, the same values on both surfaces:

| Variable | Storefront | Builder |
|---|---|---|
| `--brand-primary` | `#A78BFA` | `#A78BFA` |
| `--surface-root` | `#0B0B1A` | `#0B0B1A` |
| `--surface-card` | `#191928` | `#191928` |
| main background | `rgb(11, 11, 26)` | `rgb(11, 11, 26)` |

## Tests

- **N2**: `builderTheme.primary === storefrontTheme.primary` and
  `surfaceCard` equal — local + production ✅
- **N1/N3**: storefront sections resolve to the theme surface/text (no
  hardcoded zinc) ✅

## No Builder-only CSS / no Storefront-only overrides

Both surfaces render through the same `ComponentRenderer`/`HeroRenderer` with
the same resolved config; the only difference is the outer frame chrome.
