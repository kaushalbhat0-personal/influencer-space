"use client";
// 06A guardrail: workspace must persist APPLIED theme, never preview —
// performSave(currentThemeId, currentThemeId) — never previewThemeId

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { ResizablePanel } from "./panel";
import { BuilderToolbar } from "./toolbar";
import { BuilderSidebar } from "./sidebar";
import { BuilderProperties } from "./properties";
import { BuilderMobilePanel } from "./mobile-panel";
import { InteractiveCanvas } from "../canvas/interactive-canvas";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { builderPersistence } from "./persistence";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import type { PublishedSnapshot } from "@/types/snapshot";
import { useKeyboardShortcuts } from "../shared/keyboard";
import { loadBuilderPages, saveBuilderPages } from "@/actions/builder.actions";
import { applyThemePackage, updateTheme } from "@/actions/theme.actions";
import type { AppearanceState } from "./appearance-panel";
import { normalizeThemeId } from "@/lib/theme/resolver-new";
import { getBuilderOverview, type BuilderOverviewData } from "@/actions/builder-overview.actions";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { Upload, ExternalLink, Loader2, Layers, Settings2, MousePointer2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * RCCF-68.3.3 — responsive Builder shell.
 *
 * Desktop (lg+): the existing three-column workspace — resizable Sections rail,
 * canvas, resizable Properties rail — is preserved (see `panel.tsx`, now Pointer
 * Events based). The side rails are `hidden lg:block` so below `lg` they do not
 * consume canvas width.
 *
 * Mobile (<lg): the canvas is the primary workspace at full width. Sections and
 * Properties open as bottom-sheet overlays (`BuilderMobilePanel`) driven by the
 * persistent bottom control bar. All builder state/commands/save/publish/preview
 * semantics are untouched — this only changes the presentation shell.
 */
type MobilePanel = "sections" | "properties" | null;

function shallowEqualAppearance(a: AppearanceState | null | undefined, b: AppearanceState | null | undefined): boolean {
  if (!a || !b) return a === b;
  return (
    a.font === b.font &&
    a.experienceBackground === b.experienceBackground &&
    a.experienceSurface === b.experienceSurface &&
    a.headingWeight === b.headingWeight &&
    a.borderRadius === b.borderRadius &&
    a.layoutDensity === b.layoutDensity &&
    a.heroTextAlign === b.heroTextAlign &&
    a.heroContentWidth === b.heroContentWidth &&
    a.heroOverlay === b.heroOverlay &&
    a.experienceBackgroundImage === b.experienceBackgroundImage &&
    a.experienceBackgroundImageAssetId === b.experienceBackgroundImageAssetId &&
    a.experienceBackgroundImageOpacity === b.experienceBackgroundImageOpacity
  );
}

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const persisted = builderPersistence.load();

  const [leftCollapsed, setLeftCollapsed] = useState(persisted.sidebarCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(persisted.rightPanelCollapsed);
  const [device, setDevice] = useState<BuilderCanvasType["device"]>(
    (["desktop", "tablet", "mobile"] as const).includes(persisted.responsiveMode as never)
      ? persisted.responsiveMode as BuilderCanvasType["device"] : "desktop"
  );
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("/");
  const [publishStatus, setPublishStatus] = useState<PublishStatusValue>("draft");
  const [themeName, setThemeName] = useState<string | null>(null);
  const [blueprintName, setBlueprintName] = useState<string | null>(null);
  const [planCode, setPlanCode] = useState<string | null>(null);
  const [currentThemeId, setCurrentThemeId] = useState<string | null>(null);
  const [previewThemeId, setPreviewThemeId] = useState<string | null>(null);
  // VALIDATION-03.5 A1: bumped after every save attempt so a FAILED autosave
  // re-arms the debounce (otherwise autosave dies silently after one error).
  const [saveAttempt, setSaveAttempt] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [completionPct, setCompletionPct] = useState(0);
  const [overviewData, setOverviewData] = useState<BuilderOverviewData | null>(null);
  const [publishing, setPublishing] = useState(false);
  // RCCF-IMPLEMENTATION-74: the Website Aggregate fetched by the canvas
  // (getLivePreviewData) is shared here so the sidebar renders canonical item
  // counts from the SAME payload — zero extra queries, always in sync.
  const [liveContent, setLiveContent] = useState<PublishedSnapshot["content"] | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  // 06A: local appearance draft — preview-first, no server persistence per control
  const [appearanceDraft, setAppearanceDraft] = useState<AppearanceState | null>(null);
  // 06B: unified Builder save status (single draft for appearance + pages)
  const [saveStatus, setSaveStatus] = useState<"CLEAN" | "DIRTY" | "SAVING" | "SAVED" | "FAILED">("CLEAN");

  // RCCF-BUILDER-03A: canonical reconciliation after appearance mutation.
  // 06A: local preview — refresh is best-effort legacy, not triggered per control.
  const refreshOverview = useCallback(async () => {
    try {
      const r = await getBuilderOverview();
      if (r.success && r.data) setOverviewData(r.data);
    } catch {
      // best-effort
    }
  }, []);

  // 06A: preview-first local draft — initialize from canonical, preserve local until reload
  useEffect(() => {
    if (!overviewData?.appearance) return;
    if (appearanceDraft) return;
    const a = overviewData.appearance;
    setAppearanceDraft({
      font: a.font,
      experienceBackground: a.experienceBackground,
      experienceSurface: a.experienceSurface,
      headingWeight: a.headingWeight,
      borderRadius: a.borderRadius,
      layoutDensity: a.layoutDensity as "compact" | "comfortable" | "spacious",
      heroTextAlign: a.heroTextAlign,
      heroContentWidth: a.heroContentWidth,
      heroOverlay: a.heroOverlay,
      experienceBackgroundImage: a.experienceBackgroundImage,
      experienceBackgroundImageAssetId: a.experienceBackgroundImageAssetId,
      experienceBackgroundImageOpacity: a.experienceBackgroundImageOpacity,
    });
  }, [overviewData?.appearance, appearanceDraft]);

  const handleAppearancePreviewChange = useCallback((next: AppearanceState) => {
    setAppearanceDraft(next);
    setSaveStatus((prev) => (prev === "SAVING" ? prev : "DIRTY"));
  }, []);

  // 06B: unified dirty detection (appearance OR pages)
  const canonicalAppearance = overviewData?.appearance as AppearanceState | undefined;
  const isAppearanceDirty = (() => {
    if (!appearanceDraft || !canonicalAppearance) return false;
    return !shallowEqualAppearance(appearanceDraft, canonicalAppearance);
  })();
  const isPageDirty = builderStore.isDirty;
  const isBuilderDirty = isAppearanceDirty || isPageDirty;

  useEffect(() => {
    if (saveStatus === "SAVING" || saveStatus === "FAILED") return;
    if (isBuilderDirty) {
      if (saveStatus === "CLEAN" || saveStatus === "SAVED") setSaveStatus("DIRTY");
    } else {
      if (saveStatus === "DIRTY") setSaveStatus("CLEAN");
    }
  }, [isBuilderDirty, saveStatus]);

  useEffect(() => {
    loadBuilderPages()
      .then((res) => {
        if (res.success && res.pages && res.pages.length > 0) {
          builderStore.hydrate(res.pages);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    import("@/actions/publish.actions").then((mod) =>
      mod.getPublishStatus().then((r) => {
        if (r.success && r.status) {
          if (r.status.state === "live") setPublishStatus("published");
          else if (r.status.state === "preview") setPublishStatus("preview");
          else setPublishStatus("draft");
          if (r.status.storefrontUrl) setStorefrontUrl(r.status.storefrontUrl);
        }
      })
    ).catch(() => {});

    getBuilderOverview().then((r) => {
      if (r.success && r.data) {
        const d = r.data;
        setThemeName(d.website.themePackageId);
        setCurrentThemeId(normalizeThemeId(d.website.themePackageId));
        setBlueprintName(d.blueprint?.name ?? null);
        // RCCF-LAUNCH-TRACK-06: the CANONICAL plan code drives theme
        // entitlement — the display name previously resolved to "free" and
        // locked every premium theme in the picker for Grow/Scale users.
        setPlanCode(d.subscription?.code ?? null);
        setCreatorName(d.tenant.name);
        setOverviewData(d);
        import("@/actions/health.actions").then((mod) =>
          mod.getWebsiteHealthScore(d.tenant.id).then((h) => {
            if (h.success && h.score != null) setCompletionPct(h.score);
          })
        ).catch(() => {});
      }
    }).catch(() => {});

    // RCCF-LAUNCH-TRACK-06 (Phase 1): "Open in Builder" from the Marketplace
    // arrives as ?theme=<id> — open the builder with that theme PREVIEWED
    // (never applied). The creator applies + publishes from the builder.
    try {
      const themeParam = new URLSearchParams(window.location.search).get("theme");
      if (themeParam) setPreviewThemeId(normalizeThemeId(themeParam));
    } catch {
      // ignore — preview is best-effort
    }
  }, []);

  // Re-render whenever the store's dirty flag changes so the autosave effect
  // below re-evaluates. The store is a plain class (not reactive), so this
  // subscription is what makes autosave fire reliably.
  useEffect(() => {
    return builderEvents.subscribe("store:changed", () => forceRender());
  }, []);

  useEffect(() => {
    builderPersistence.save({ sidebarCollapsed: leftCollapsed, rightPanelCollapsed: rightCollapsed, responsiveMode: device });
  }, [leftCollapsed, rightCollapsed, device]);

  // IMPLEMENTATION-21 (BUG 5/6): keyboard shortcuts ([ / ]) toggle the panels
  // via a window event; this keeps the shortcuts decoupled from the toggles.
  useEffect(() => {
    const onToggle = (e: Event) => {
      const side = (e as CustomEvent<{ side: string }>).detail?.side;
      if (side === "left") setLeftCollapsed((v) => !v);
      if (side === "right") setRightCollapsed((v) => !v);
    };
    window.addEventListener("builder:panel-toggle", onToggle);
    return () => window.removeEventListener("builder:panel-toggle", onToggle);
  }, []);

  const performSave = useCallback(async (themeId: string | null, activeThemeId: string | null): Promise<boolean> => {
    setSaving(true);
    const tenantId = overviewData?.tenant.id;
    try {
      if (themeId && themeId !== activeThemeId && tenantId) {
        // Theme is website-level, not per-page: persist to Website.themePackageId.
        const themeRes = await applyThemePackage(tenantId, themeId);
        if (themeRes.success && themeRes.themeId) {
          setCurrentThemeId(themeRes.themeId);
          setThemeName(themeRes.themeId);
          setPreviewThemeId(null);
        } else {
          setStatusMsg("Theme save failed");
          return false;
        }
      }
      const pages = builderStore.serialize();
      const res = await saveBuilderPages(pages);
      if (res.success) {
        builderStore.markClean();
        setStatusMsg("Saved");
        return true;
      } else {
        setStatusMsg(res.error || "Save failed");
        return false;
      }
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Save failed");
      return false;
    } finally {
      setSaving(false);
      setSaveAttempt((n) => n + 1);
    }
  }, [overviewData]);

  // 06B: unified Save Draft — appearance (local) + pages (store) as one draft
  const handleSaveDraft = useCallback(async (): Promise<boolean> => {
    if (!isBuilderDirty) {
      setStatusMsg("All changes saved");
      setSaveStatus("CLEAN");
      return true;
    }
    if (saveStatus === "SAVING") return false;
    setSaveStatus("SAVING");
    setSaving(true);
    setStatusMsg("Saving changes…");
    let appearanceOk = true;
    let pagesOk = true;

    if (isAppearanceDirty && appearanceDraft && overviewData?.tenant.id) {
      try {
        const res = await updateTheme(overviewData.tenant.id, {
          font: appearanceDraft.font,
          headingWeight: appearanceDraft.headingWeight,
          borderRadius: appearanceDraft.borderRadius,
          layoutDensity: appearanceDraft.layoutDensity,
          experienceBackground: appearanceDraft.experienceBackground,
          experienceSurface: appearanceDraft.experienceSurface,
          heroTextAlign: appearanceDraft.heroTextAlign,
          heroContentWidth: appearanceDraft.heroContentWidth,
          heroOverlay: appearanceDraft.heroOverlay,
          experienceBackgroundImage: appearanceDraft.experienceBackgroundImage,
          experienceBackgroundImageAssetId: appearanceDraft.experienceBackgroundImageAssetId,
          experienceBackgroundImageOpacity: appearanceDraft.experienceBackgroundImageOpacity,
        });
        if (!res.success) {
          appearanceOk = false;
          setStatusMsg(res.error || "Failed to save appearance");
        } else {
          setOverviewData((prev) => (prev ? ({ ...prev, appearance: { ...appearanceDraft } } as BuilderOverviewData) : prev));
        }
      } catch (e) {
        appearanceOk = false;
        setStatusMsg(e instanceof Error ? e.message : "Failed to save appearance");
      }
    }

    if (appearanceOk && isPageDirty) {
      try {
        const pages = builderStore.serialize();
        const res = await saveBuilderPages(pages);
        if (!res.success) {
          pagesOk = false;
          setStatusMsg(res.error || "Failed to save pages");
        } else {
          builderStore.markClean();
        }
      } catch (e) {
        pagesOk = false;
        setStatusMsg(e instanceof Error ? e.message : "Failed to save pages");
      }
    }

    if (appearanceOk && pagesOk) {
      setSaveStatus("SAVED");
      setStatusMsg("Changes saved");
      setSaveAttempt((n) => n + 1);
      setSaving(false);
      return true;
    } else {
      setSaveStatus("FAILED");
      setSaveAttempt((n) => n + 1);
      setSaving(false);
      return false;
    }
  }, [isBuilderDirty, isAppearanceDirty, isPageDirty, appearanceDraft, overviewData, saveStatus]);

  // 06B: remove page autosave — explicit Save Draft only
  useEffect(() => {
    if (autoSaveRef.current) {
      clearTimeout(autoSaveRef.current);
      autoSaveRef.current = null;
    }
  }, [isBuilderDirty]);

  // 06B: unified beforeunload — warn if Builder is DIRTY (appearance OR pages)
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (isBuilderDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [isBuilderDirty]);

  // 06B: Ctrl+S / save:requested → Save Draft (unified)
  useEffect(() => {
    return builderEvents.subscribe("save:requested", () => {
      if (isBuilderDirty) handleSaveDraft();
    });
  }, [isBuilderDirty, handleSaveDraft]);

  const handleThemePreview = useCallback((themeId: string) => {
    // IMPLEMENTATION-26: preview is TEMPORARY — it must never mark the draft
    // dirty, autosave, or persist. Leaving preview restores the applied theme.
    setPreviewThemeId(themeId);
  }, []);

  // RCCF-LAUNCH-TRACK-06 (Phase 3/10): applying a theme is an UNPUBLISHED draft
  // change — after apply, refresh the publish status so the toolbar shows
  // "Publish required" instead of a stale "Published".
  const refreshPublishStatus = useCallback(() => {
    import("@/actions/publish.actions").then((mod) =>
      mod.getPublishStatus().then((r) => {
        if (r.success && r.status) {
          if (r.status.state === "live") setPublishStatus("published");
          else if (r.status.state === "preview") setPublishStatus("preview");
          else setPublishStatus("draft");
          if (r.status.storefrontUrl) setStorefrontUrl(r.status.storefrontUrl);
        }
      })
    ).catch(() => {});
  }, []);

  // External publish (dashboard / API auto-publish) — refresh canonical state on refocus
  useEffect(() => {
    const onFocusRefresh = () => {
      refreshPublishStatus();
      refreshOverview();
    };
    window.addEventListener("focus", onFocusRefresh);
    const onVis = () => {
      if (!document.hidden) onFocusRefresh();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("focus", onFocusRefresh);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [refreshPublishStatus, refreshOverview]);

  const handleApplyTheme = useCallback(
    async (themeId: string) => {
      // Apply persists the theme + saves the draft (no publish).
      if (!themeId || !overviewData?.tenant.id) return;
      // Persist FIRST, then reflect it in state so the Current badge can never
      // appear before the theme is actually applied.
      const saved = await performSave(themeId, currentThemeId);
      if (saved) {
        setPreviewThemeId(null);
        setCurrentThemeId(themeId);
        setThemeName(themeId);
        builderStore.markClean();
        refreshPublishStatus();
        // RCCF-LAUNCH-TRACK-07 (P6): strip the ?theme= param after applying so
        // a refresh cannot resurrect a stale preview over the applied theme.
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has("theme")) {
            url.searchParams.delete("theme");
            window.history.replaceState({}, "", url.toString());
          }
        } catch {
          // best-effort — URL cleanup must never block an apply
        }
      }
    },
    [performSave, currentThemeId, overviewData, refreshPublishStatus],
  );

  const handlePublish = useCallback(async () => {
    if (publishing) return;
    if (isBuilderDirty) {
      const saved = await handleSaveDraft();
      if (!saved) return;
    }
    setPublishing(true);
    setStatusMsg("Publishing…");
    try {
      const mod = await import("@/actions/publish.actions");
      const res = await mod.publishWebsite();
      if (res.success) {
        setPublishStatus("published");
        setStatusMsg("Published successfully");
        // Canonical overview is stale after publish (snapshot now equals draft)
        await refreshOverview();
        refreshPublishStatus();
        // Draft now matches live snapshot
        builderStore.markClean();
        setSaveStatus("CLEAN");
      } else {
        setStatusMsg(res.error || "Publish failed");
      }
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Publish failed");
    } finally {
      setPublishing(false);
    }
  }, [publishing, isBuilderDirty, handleSaveDraft, refreshPublishStatus, refreshOverview]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--surface-root)]">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--brand-primary)] border-t-transparent" />
          <p className="text-sm text-[var(--text-muted)]">Loading your editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-[var(--surface-root)]">
      <BuilderToolbar
        device={device}
        themeName={themeName}
        blueprintName={blueprintName}
        creatorName={creatorName}
        completionPct={completionPct}
        publishStatus={publishStatus}
        storefrontUrl={storefrontUrl}
        onDeviceChange={(d) => { setDevice(d); builderStore.setDevice(d); }}
        onSave={handleSaveDraft}
        saving={saveStatus === "SAVING"}
        mobilePanel={mobilePanel}
        onOpenSections={() => setMobilePanel((p) => (p === "sections" ? null : "sections"))}
        onOpenProperties={() => setMobilePanel((p) => (p === "properties" ? null : "properties"))}
      />

      {/* Workspace row — side rails are desktop-only; canvas is always full width below lg. */}
      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} defaultWidth={280} className="hidden lg:block">
          <BuilderSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} aggregate={liveContent} />
        </ResizablePanel>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto">
            <InteractiveCanvas device={device} zoom={1} themePackageId={previewThemeId ?? currentThemeId ?? null} onLiveContentChange={setLiveContent} appearanceDraft={appearanceDraft} />
          </div>
        </div>

        <ResizablePanel side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)} defaultWidth={260} className="hidden lg:block">
          <BuilderProperties
            collapsed={rightCollapsed}
            onToggle={() => setRightCollapsed((v) => !v)}
            currentThemeId={currentThemeId}
            planCode={planCode}
            completionPct={completionPct}
            onThemePreview={handleThemePreview}
            previewThemeId={previewThemeId}
            onApplyTheme={handleApplyTheme}
            overview={overviewData}
            tenantId={overviewData?.tenant.id ?? null}
            onAppearanceRefresh={refreshOverview}
            appearanceDraft={appearanceDraft}
            onAppearancePreviewChange={handleAppearancePreviewChange}
          />
        </ResizablePanel>
      </div>

      {/* Persistent mobile bottom control bar — Canvas is the default workspace. */}
      <div className="flex h-12 shrink-0 items-center border-t border-[var(--border)] bg-[var(--surface-base)] lg:hidden" data-testid="builder-mobile-bar">
        <MobileBarButton
          active={mobilePanel === "sections"}
          onClick={() => setMobilePanel((p) => (p === "sections" ? null : "sections"))}
          label="Sections"
          testId="mobile-bar-sections"
        >
          <Layers className="h-4 w-4" />
        </MobileBarButton>
        <MobileBarButton
          active={mobilePanel === null}
          onClick={() => setMobilePanel(null)}
          label="Canvas"
          testId="mobile-bar-canvas"
        >
          <MousePointer2 className="h-4 w-4" />
        </MobileBarButton>
        <MobileBarButton
          active={mobilePanel === "properties"}
          onClick={() => setMobilePanel((p) => (p === "properties" ? null : "properties"))}
          label="Properties"
          testId="mobile-bar-properties"
        >
          <Settings2 className="h-4 w-4" />
        </MobileBarButton>
      </div>

      {/* Mobile overlays — Sections / Properties as bottom sheets. */}
      <BuilderMobilePanel
        open={mobilePanel === "sections"}
        onClose={() => setMobilePanel(null)}
        title="Sections"
      >
        <BuilderSidebar collapsed={false} onToggle={() => setMobilePanel(null)} aggregate={liveContent} />
      </BuilderMobilePanel>
      <BuilderMobilePanel
        open={mobilePanel === "properties"}
        onClose={() => setMobilePanel(null)}
        title="Properties"
      >
        <BuilderProperties
          collapsed={false}
          onToggle={() => setMobilePanel(null)}
          currentThemeId={currentThemeId}
          planCode={planCode}
          completionPct={completionPct}
          onThemePreview={handleThemePreview}
          previewThemeId={previewThemeId}
          onApplyTheme={handleApplyTheme}
          overview={overviewData}
          tenantId={overviewData?.tenant.id ?? null}
          onAppearanceRefresh={refreshOverview}
          appearanceDraft={appearanceDraft}
          onAppearancePreviewChange={handleAppearancePreviewChange}
        />
      </BuilderMobilePanel>

      {/* Status bar — 06B unified save status */}
      <div className="flex h-8 items-center justify-between border-t border-[var(--border-subtle)] bg-[var(--surface-base)] px-3 text-[10px] text-zinc-600 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span
            role="status"
            aria-live="polite"
            aria-atomic="true"
            data-testid="builder-save-status"
            className={cn(
              "text-[10px] font-medium",
              saveStatus === "DIRTY" ? "text-amber-400" : saveStatus === "SAVING" ? "text-amber-400 animate-pulse" : saveStatus === "SAVED" ? "text-emerald-400" : saveStatus === "FAILED" ? "text-red-400" : "text-zinc-500"
            )}
          >
            {saveStatus === "DIRTY" ? "Unsaved changes" : saveStatus === "SAVING" ? "Saving changes…" : saveStatus === "SAVED" ? "Changes saved" : saveStatus === "FAILED" ? "Failed to save changes" : "All changes saved"}
          </span>
          <span className="text-zinc-800 hidden sm:inline">|</span>
          {statusMsg && <span className={cn("truncate", statusMsg === "Changes saved" || statusMsg === "Saved" || statusMsg === "All changes saved" ? "text-emerald-400" : "text-red-400")}>{statusMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-600 hidden md:inline" title="Changes are saved locally until you publish">Draft</span>
          <span className="text-zinc-800 hidden md:inline">|</span>
          <button
            onClick={handleSaveDraft}
            disabled={!isBuilderDirty || saveStatus === "SAVING"}
            data-testid="builder-save-draft"
            aria-label="Save draft — save without publishing"
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
          >
            {saveStatus === "SAVING" ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
            Save Draft
          </button>
          <span className="text-zinc-800 hidden md:inline">|</span>
          <button
            onClick={handlePublish}
            disabled={publishing || saveStatus === "SAVING"}
            data-testid="builder-publish"
            aria-label="Publish — make changes live"
            className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2 py-0.5 text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
          >
            {publishing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            Publish
          </button>
          <span className="text-zinc-800 hidden md:inline">|</span>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
            <ExternalLink className="h-3 w-3" />
            <span className="hidden sm:inline">View Live</span>
            <span className="sm:hidden">Live</span>
          </a>
        </div>
      </div>
    </div>
  );
}

function MobileBarButton({
  active,
  onClick,
  label,
  testId,
  children,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      aria-label={label}
      data-testid={testId}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-0.5 py-1.5 text-[9px] font-medium transition-colors",
        active ? "text-indigo-400" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
