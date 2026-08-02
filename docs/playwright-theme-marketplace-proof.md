# Playwright Theme Marketplace Proof — IMPLEMENTATION-25

File: `tests/e2e/production/implementation25.spec.ts` (serial)

| Test | Verifies | Local | Production |
|---|---|---|---|
| P1 | Marketplace renders ≥45 themes with search + subscription gating (lock badges for business-tier, apply buttons for unlocked, plan banner "of 50 themes unlocked") | ✅ | ✅ |
| P2 | Favorites persist across reloads (localStorage seed → reload → Favorites toggle appears) | ✅ | ✅ |
| P3 | Locked theme blocks apply (detail has no Apply, shows Upgrade); applying an unlocked theme makes it Current instantly | ✅ | ✅ |

## Evidence

- **P1**: `[data-testid^="theme-card-"]` ≥ 45; `[data-testid^="lock-badge-"]` > 0;
  `[data-testid^="apply-theme-"]` > 0; body matches `/of 50 themes unlocked/`.
- **P2**: seeding `theme_favorites` in localStorage then reloading restores the
  Favorites toggle (persistence).
- **P3**: a locked theme's detail shows `Upgrade to unlock` and no apply
  button; the first unlocked theme's Apply → the card shows **Current**.

Screenshots: `p1-marketplace-gating.png`, `p2-favorites-persist.png`,
`p3-theme-applied.png`.

## Command

```
npx playwright test --project=production --grep "Marketplace renders ~50|Favorites persist|Unlocked theme applies" --workers=1 --reporter=line
BASE_URL=https://influencer-space-alpha.vercel.app   # production
```
