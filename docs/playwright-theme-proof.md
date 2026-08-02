# Playwright Theme Proof — IMPLEMENTATION-24

File: `tests/e2e/production/implementation24.spec.ts` (serial)

| Test | Verifies | Local | Production |
|---|---|---|---|
| N1 | Storefront sections consume the runtime theme (no hardcoded zinc regressions) — border color resolves to the theme `--border` | ✅ | ✅ |
| N2 | Builder == Storefront: the same runtime theme vars (`--brand-primary`, `--surface-card`, …) on both surfaces | ✅ | ✅ |
| N3 | Runtime theme object drives the rendered colors — computed styles from the active theme | ✅ | ✅ |

## How it proves the integration

- `storefrontTheme(page)` reads the vars + `backgroundColor` off
  `main[data-runtime-signature]`.
- `builderTheme(page)` reads the same vars off the Builder device frame.
- N2 asserts the **same values** on both surfaces (parity).
- N3 logs the active theme's primary/background/surface to show the rendered
  colors are the theme's, not fixed zinc grays.

## Evidence

```
Storefront main bg: rgb(11, 11, 26)          (theme background #0B0B1A)
Storefront --surface-card: #191928            (themed card surface)
Storefront --brand-primary: #A78BFA           (theme primary)
Builder frame vars == Storefront vars         (N2)
```

Screenshots: `n1-storefront-themed.png`, `n2-builder-storefront-parity.png`,
`n3-theme-proof.png`.

## Command

```
npx playwright test --project=production --grep "consume the runtime theme|same runtime theme vars|Runtime theme object drives" --workers=1 --reporter=line
BASE_URL=https://influencer-space-alpha.vercel.app   # production
```
