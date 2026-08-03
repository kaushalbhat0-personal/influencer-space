# Playwright Theme Builder Proof — IMPLEMENTATION-26

File: `tests/e2e/production/implementation26.spec.ts` (serial)

| Test | Verifies | Local | Production |
|---|---|---|---|
| Q1 | Builder shows **all 50** themes ("of 50 themes") + locked business themes visible | ✅ | ✅ |
| Q2 | Locked theme previews in Builder (canvas vars change) **without persisting** (DB `themePackageId` unchanged); Upgrade shown, no Apply | ✅ | ✅ |
| Q3 | Applying an unlocked theme **persists** (DB changes, polled) + Current badge moves | ✅ | ✅ |
| Q4 | Preview is temporary — reverting restores the applied theme's canvas vars | ✅ | ✅ |

## Key assertions

- **Q1**: `[data-testid^="builder-theme-"]` count === 50; locked badges present.
- **Q2**: preview banner visible; `[data-testid="builder-upgrade"]` present,
  `[data-testid="builder-apply-theme"]` absent; DB theme unchanged after.
- **Q3**: after Apply, the DB `Website.themePackageId` contains the clicked
  slug; the card shows Current.
- **Q4**: canvas `--brand` vars change on preview and return to the original
  after revert.

## Command

```
npx playwright test --project=production --grep "Builder shows ALL 50|Locked theme previews|Applying an unlocked theme|Preview is temporary" --workers=1 --reporter=line
BASE_URL=https://influencer-space-alpha.vercel.app   # production
```
