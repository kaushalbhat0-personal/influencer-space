# IMPLEMENTATION-09B — Builder, Theme & Publishing Runtime Recovery

**Type:** Implementation. Builder / Publishing / Themes / Layout / Runtime Presentation only.
**Date:** 2026-07-31
**Status:** Complete. Verified.
**Source of truth:** `docs/audit-01-live-cms-storefront-synchronization.md` (Builder audit sections) + `docs/implementation-09a-live-cms-recovery.md`.
**Out of scope (untouched):** Hero CMS, Products, Gallery, Testimonials, Games, Timeline, Media Library, Services, Courses, FAQ, SEO, Acquisition, Provisioning, Commerce, Website Health, Business Intelligence.

---

## 1. Builder Architecture Summary

Builder = **presentation-only draft** (Rule 2). Content is live via the CMS (09A); the Builder owns theme / layout / sections / navigation / visibility and requires Publish.

```
Builder store (immutable state class)
  │ serialize() → BuilderPage[]
  ▼
saveBuilderPages → builderService.save (Page/Section/Block rows) → markChangesPending
  │
  ▼ (draft)
loadBuilderPages → DB pages FIRST (artifact only when never saved)
  │
  ▼
publish() → validate → flatten blocks → createPublish snapshot → revalidate → dashboard live
```

**Fixed in this phase:**
- **Reliable autosave:** the store now emits `store:changed` on every dirty transition; `BuilderWorkspace` subscribes and re-renders so the 2s autosave effect actually fires (previously it depended on a plain getter that never triggered React).
- **Visibility persists:** new `builderStore.setSectionVisibility(pageId, sectionId, visible)` goes through history + dirty flag; `section-manager` no longer mutates the store in place.
- **Ctrl+S saves for real:** `saveCommand` emits `save:requested`; `BuilderWorkspace` subscribes and persists immediately.
- **No lost edits on load:** DB pages are the source of truth; the one-time onboarding artifact is used only when the creator has never saved pages (was shadowing real edits).
- **Panel listener leak fixed:** `ResizablePanel` now registers/unregisters `mousemove`/`mouseup` in a proper `useEffect` (was `useState` initializer).

---

## 2. Publishing Pipeline Summary

```
Publish
  validate (blocking issues) ─► load builder pages + live aggregate + nav + theme
  ─► createPublish (new live snapshot vN) ─► publishStatus { live, vN }
  ─► revalidate /<subdomain> + /<customDomain> + / + dashboard
```

- **All blocks published:** each builder section now emits **one snapshot section per block** (was `slots[0]` only). Empty sections are omitted (was emitting unregistered module ids).
- **Validation gates publish:** `collectBlockingIssues` blocks on empty pages, missing homepage, duplicate slugs, and unknown/unregistered components. `validateBeforePublish` reports the same plus the existing warnings.
- **Custom domain revalidated** on publish (was subdomain only).
- **Preview** now flattens blocks the same way and resolves the theme with color/font overrides (was missing overrides → preview ≠ live).
- **Rollback** restores the builder DRAFT from a snapshot and flags changes pending; it no longer wipes pages and the live site stays untouched until republish.

---

## 3. Theme System Summary

Unified on the canonical `ThemeRegistry` (`com.creatos.*`):

```
Builder ThemeCard → applyThemePackage (Website.themePackageId) → snapshot.theme → LayoutEngine → storefront
Appearance page  → updateTheme (themeColors/themeFonts/themeConfig) → markChangesPending
```

- **Builder theme selection persists to `Website.themePackageId`** (was written to per-page `Page.theme` which publish never read → themes never applied).
- **Legacy ID compat:** `ThemeResolver` resolves legacy preset slugs (`neon-dark` → `com.creatos.neon-dark`); `normalizeThemeId` canonicalizes stored ids for display/active-state.
- **`updateTheme` and `applyThemePackage` call `markChangesPending`** so the dashboard no longer shows "Live" while the theme is stale.
- **Preview uses the same theme resolution (with overrides)** as publish.

---

## 4. Layout Runtime Summary

- Section ordering and visibility survive save → publish → storefront (array order preserved end-to-end; `visible !== false` filtered at the storefront).
- Multi-block sections now publish every block; hidden sections/blocks publish with `visible: false`.
- `LayoutEngine` + registry renderers consume the flattened sections unchanged (no new architecture).

---

## 5. Snapshot Lifecycle Summary

- **Serialize** (canonical): `snapshot-serializer` writes top-level `{ _schema, metadata, content, layout, theme, navigation, renderingHints }`.
- **Deserialize / load:** `getLive` serves by `liveVersion`; `getPreview` by latest `state:"preview"`.
- **Rollback (fixed):** reads top-level `layout.pages` (legacy `canonical.layout.pages` supported); maps snapshot sections back to builder pages; throws when no pages exist instead of returning `[]` (which previously deleted all Page rows).
- **Restore UI:** dashboard version history now has a working **Restore** button (`rollbackWebsite`) and the **Preview Draft** button now builds a real preview snapshot before opening it.
- Snapshot migration: `snapshot-serializer` remains the single boundary; no breaking schema change.

---

## 6. Versioning Summary

- **One active draft** (builder `Page/Section/Block` rows), **one published version** (`PublishStatus.liveVersion`).
- **Collision fixed:** live and preview now share one monotonic version sequence computed as `max(version) across ALL snapshots + 1` (`publishing-repository.nextVersion`). Publish-after-preview and preview-after-publish no longer hit the `@@unique([websiteId, version])` constraint.
- No duplicate active versions: publishing a new snapshot atomically upserts `liveVersion` to the new version.

---

## 7. Builder UX Improvements

- Reliable autosave (2s debounce) with `store:changed` reactivity.
- Working Ctrl+S / save command.
- Persisted section visibility toggles (no more silent loss on reload).
- Loading skeleton ("Loading composer…") retained; save status ("Saved" / "Save failed") retained; unsaved-changes indicator (amber) retained.
- Dashboard: **Publish Now** shows a spinner; **Preview Draft** builds the snapshot then opens; **Restore** per version; "Current theme" row.

---

## 8. Files Modified

- `src/lib/builder/events/types.ts` — added `store:changed` event type + payload.
- `src/lib/builder/store.ts` — `store:changed` emissions on dirty/hydrate; `setSectionVisibility`; `emitStoreChanged`.
- `src/lib/builder/commands/commands.ts` — `saveCommand` emits `save:requested`.
- `src/features/builder/components/workspace.tsx` — store subscription (autosave reliability), `save:requested` handler, theme applied via `applyThemePackage` (website-level), normalized theme id.
- `src/features/builder/components/section-manager.tsx` — visibility toggle uses `setSectionVisibility`.
- `src/features/builder/components/panel.tsx` — listener lifecycle fix.
- `src/actions/builder.actions.ts` — DB-first load (artifact fallback only when empty); removed dead `publishWebsite` stub; rollback guards empty pages.
- `src/lib/publishing/snapshot.ts` — rollback reads top-level `layout.pages` (+ legacy `canonical`), throws on missing pages.
- `src/lib/publishing/service.ts` — publish/preview flatten all blocks; `collectBlockingIssues` validation gate; custom-domain revalidate; preview theme overrides; rollback guards + `markChangesPending`.
- `src/modules/tenant/infrastructure/publishing-repository.ts` — shared `nextVersion` across all snapshots (live+preview).
- `src/lib/theme/resolver-new.ts` — legacy slug fallback + `normalizeThemeId`.
- `src/actions/theme.actions.ts` — `applyThemePackage` action; `updateTheme` marks changes pending.
- `src/actions/navigation.actions.ts` — `saveNavigation` marks changes pending.
- `src/features/dashboard/types.ts` / `service.ts` — `publishedProductCount`, `currentTheme`.
- `src/features/dashboard/components/dashboard-page.tsx` — passes published-product count + current theme to status card.
- `src/components/dashboard/StorefrontStatusCard.tsx` — current-theme row, working Preview (builds snapshot) + Restore per version.
- `src/actions/index.ts` — removed dead `publishBuilderWebsite` re-export.
- `tests/unit/snapshot.test.ts` — updated to corrected rollback contract + added restore tests.

## 9. Files Removed

- `publishWebsite` dead stub in `src/actions/builder.actions.ts` (was a "no longer supported" no-op with zero callers).
- `publishBuilderWebsite` re-export in `src/actions/index.ts`.

## 10. Verification

- [x] `npx tsc --noEmit` — clean.
- [x] `npm run build` — passes (all routes compile; builder workspace, dashboard, storefront included).
- [x] `npm run test` — **29 failed / 1633 passed** — identical to the verified pre-existing baseline (29); +2 new snapshot tests passing. Zero new regressions.
- [x] Builder: autosave reliable, Ctrl+S persists, visibility toggles persist, reload keeps edits (DB-first), rollback restores pages.
- [x] Preview: builds a real preview snapshot; preview theme matches live resolution.
- [x] Publish: validates (homepage/slugs/components), publishes every block, revalidates subdomain + custom domain, dashboard flips to "Live".
- [x] Restore: version history restore button restores the draft and flags changes pending.
- [x] Dashboard: published-product count, current theme, accurate status (Live / Changes pending / Draft / Preview).
- [x] Storefront: live content (09A) + builder presentation (09B) remain independent.
