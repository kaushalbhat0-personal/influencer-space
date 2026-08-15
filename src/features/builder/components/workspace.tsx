"use client";

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
import { applyThemePackage } from "@/actions/theme.actions";
import { publishWebsite } from "@/actions/publish.actions";
import { normalizeThemeId } from "@/lib/theme/resolver-new";
import { getBuilderOverview, type BuilderOverviewData } from "@/actions/builder-overview.actions";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { Upload, ExternalLink, Rocket, Loader2, Layers, Settings2, MousePointer2 } from "lucide-react";
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
  // RCCF-IMPLEMENTATION-74: the Website Aggregate fetched by the canvas
  // (getLivePreviewData) is shared here so the sidebar renders canonical item
  // counts from the SAME payload — zero extra queries, always in sync.
  const [liveContent, setLiveContent] = useState<PublishedSnapshot["content"] | null>(null);
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [publishing, setPublishing] = useState(false);

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

  useEffect(() => {
    if (!builderStore.isDirty || loading) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(() => {
      // IMPLEMENTATION-26: autosave persists the APPLIED theme only — a
      // previewed (locked/free) theme is never saved.
      performSave(currentThemeId, currentThemeId);
    }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
    // saveAttempt in deps: a failed save re-arms the debounce (A1).
  }, [builderStore.isDirty, loading, currentThemeId, performSave, saveAttempt]);

  // VALIDATION-03.5 A5: warn before closing/navigating away with unsaved
  // changes so work inside the 2s autosave window is never lost silently.
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (builderStore.isDirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  // Ctrl+S / save command → persist immediately (no debounce).
  useEffect(() => {
    return builderEvents.subscribe("save:requested", () => {
      if (builderStore.isDirty) performSave(currentThemeId, currentThemeId);
    });
  }, [performSave, currentThemeId]);

  // Publish through the SAME server action the Dashboard uses. Saves the
  // draft first so the publish always reads the latest builder pages.
  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setStatusMsg("Saving draft...");
    // Publish the APPLIED theme + draft — a preview theme is never published.
    const saved = await performSave(currentThemeId, currentThemeId);
    if (!saved) {
      setStatusMsg("Save failed — cannot publish");
      setPublishing(false);
      return;
    }
    setStatusMsg("Publishing...");
    try {
      const res = await publishWebsite();
      if (res.success) {
        setStatusMsg("Published");
        window.location.reload();
      } else {
        setStatusMsg(res.error || "Publish failed");
        setPublishing(false);
      }
    } catch (e) {
      setStatusMsg(e instanceof Error ? e.message : "Publish failed");
      setPublishing(false);
    }
  }, [performSave, previewThemeId, currentThemeId]);

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

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading your editor…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-zinc-950">
      <BuilderToolbar
        device={device}
        themeName={themeName}
        blueprintName={blueprintName}
        creatorName={creatorName}
        completionPct={completionPct}
        publishStatus={publishStatus}
        storefrontUrl={storefrontUrl}
        onDeviceChange={(d) => { setDevice(d); builderStore.setDevice(d); }}
        onSave={() => { setStatusMsg("Saving..."); performSave(currentThemeId, currentThemeId); }}
        saving={saving}
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
            <InteractiveCanvas device={device} zoom={1} themePackageId={previewThemeId ?? currentThemeId ?? null} onLiveContentChange={setLiveContent} />
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
          />
        </ResizablePanel>
      </div>

      {/* Persistent mobile bottom control bar — Canvas is the default workspace. */}
      <div className="flex h-12 shrink-0 items-center border-t border-white/10 bg-zinc-950 lg:hidden" data-testid="builder-mobile-bar">
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
        />
      </BuilderMobilePanel>

      {/* Status bar */}
      <div className="flex h-8 items-center justify-between border-t border-white/5 bg-zinc-950 px-3 text-[10px] text-zinc-600 shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <span className={builderStore.isDirty ? "text-amber-400" : "text-emerald-400"}>
            {builderStore.isDirty ? "Unsaved changes" : "Draft saved"}
          </span>
          <span className="text-zinc-800 hidden sm:inline">|</span>
          {statusMsg && <span className={cn("truncate", statusMsg === "Saved" ? "text-emerald-400" : "text-red-400")}>{statusMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-700 hidden md:inline">v{builderStore.publish.version}</span>
          <span className="text-zinc-800 hidden md:inline">|</span>
          <button
            onClick={() => performSave(currentThemeId, currentThemeId)}
            disabled={saving}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            Save
          </button>
          <span className="text-zinc-800 hidden md:inline">|</span>
          <button
            onClick={handlePublish}
            disabled={saving || publishing}
            data-testid="builder-publish"
            className="flex items-center gap-1 rounded-md bg-emerald-500/10 px-2.5 py-1 text-emerald-400 transition-colors hover:bg-emerald-500/20 disabled:opacity-50"
          >
            {publishing ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Rocket className="h-3 w-3" />
            )}
            {publishing ? "Publishing..." : "Publish"}
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
        active ? "text-s8ul-cyan" : "text-zinc-500 hover:text-zinc-300",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
  );
}
