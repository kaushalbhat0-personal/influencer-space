# Theme Marketplace

**Track:** RCCF-LAUNCH-TRACK-06 (Phase 1)
**Status:** Implemented — browse-only

## What the Marketplace does now

- **Browse / Search / Filter** — by category, tier, experience pack.
- **Preview** — theme palette gradient + swatches + typography (from the theme's
  own tokens).
- **Compare** — detail panel shows colors, typography, experience, tags.
- **Favorite / Recent** — client-side (localStorage), no server mutation.
- **Open in Builder** — routes to `/builder?theme=<id>`; the Builder previews the
  theme and is the only place it can be applied + published.

## What the Marketplace NO LONGER does

- ❌ Apply Theme (no `applyThemePackage` call)
- ❌ Show "Applied" / "Current Theme" badges
- ❌ Mutate any website / save / publish

`admin/themes/page.tsx` no longer queries `website.themePackageId`; the
`currentThemeId`/`tenantId` props were removed from the client.

## Gating

Lock badges + "Upgrade to unlock" remain (capability-driven): `isThemeUnlocked`
uses the **canonical plan code** passed from `resolveActivePlan` (already
correct on the Marketplace side).
