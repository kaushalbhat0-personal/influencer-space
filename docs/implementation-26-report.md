# IMPLEMENTATION-26 — Unified Theme Selection, Builder Preview & Publish Workflow

**Date:** 2026-08-02 · **Status:** Complete · Local **4/4** · Production **4/4**

## Summary

Unified theme selection across Builder, Marketplace and Publish — reusing the
existing Theme Engine, Runtime, Marketplace, Registry and Subscription Gating.
No duplicate architecture.

## Delivered

- **Single theme source**: Builder now renders **all 50 themes** from
  `themeRegistry.getAll()` (the same catalog as Marketplace/Settings) — no
  `slice(0,6)` subset, no Builder-specific list.
- **Locked preview (Figma-style)**: locked themes are previewable in the
  Builder with a live canvas render + banner
  ("Previewing X (Tier) — Upgrade to apply permanently"). Apply is replaced by
  an Upgrade dialog — never silently blocked.
- **Temporary preview**: previewing never marks the draft dirty, never autosaves
  or persists; leaving preview restores the applied theme. Autosave, Ctrl+S and
  Publish persist the **applied** theme only.
- **Apply workflow**: Apply persists the theme (first, to avoid badge/Db race)
  + saves the draft — no publish; Current badge moves instantly.
- **Publish workflow**: preview → apply → autosave draft → publish — preview
  themes are never published.
- **Builder theme browser**: search, category filter, favorites (shared key),
  tier/locked/current/preview badges, "N of 50" counter — reusing the same
  registry + tiers/access gating as the Marketplace.

## Verification

- `npx tsc --noEmit` ✅ · `npm test` **73 files / 1647 tests** ✅ · `npm run build` ✅
- Playwright local **Q1–Q4 4/4** ✅ · **production 4/4** ✅
- Deployed to Vercel ✅

## Acceptance

✅ Builder shows all 50 themes · ✅ locked visible + previewable + not
applicable · ✅ current clearly marked · ✅ preview temporary · ✅ apply persists
draft · ✅ publish publishes draft · ✅ autosave preserved · ✅ Marketplace /
Builder / Storefront synced · ✅ one runtime / one marketplace / one catalog ·
✅ zero duplicated logic · ✅ Playwright production verification · ✅ build /
tests · ✅ deployed.
