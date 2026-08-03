"use client";

import { useState, useEffect, useRef, useCallback, useReducer } from "react";
import { ResizablePanel } from "./panel";
import { BuilderToolbar } from "./toolbar";
import { BuilderSidebar } from "./sidebar";
import { BuilderProperties } from "./properties";
import { InteractiveCanvas } from "../canvas/interactive-canvas";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { builderPersistence } from "./persistence";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import { useKeyboardShortcuts } from "../shared/keyboard";
import { loadBuilderPages, saveBuilderPages } from "@/actions/builder.actions";
import { applyThemePackage } from "@/actions/theme.actions";
import { publishWebsite } from "@/actions/publish.actions";
import { normalizeThemeId } from "@/lib/theme/resolver-new";
import { getBuilderOverview, type BuilderOverviewData } from "@/actions/builder-overview.actions";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { Upload, ExternalLink, Rocket, Loader2 } from "lucide-react";

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const persisted = builderPersistence.load();

  const [leftCollapsed, setLeftCollapsed] = useState(persisted.sidebarCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(persisted.rightPanelCollapsed);
  const [device, setDevice] = useState<BuilderCanvasType["device"]>(
    (["desktop", "tablet", "mobile"] as const).includes(persisted.responsiveMode as never)
      ? persisted.responsiveMode as BuilderCanvasType["device"] : "desktop"
  );
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
  const [creatorName, setCreatorName] = useState("");
  const [completionPct, setCompletionPct] = useState(0);
  const [overviewData, setOverviewData] = useState<BuilderOverviewData | null>(null);
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
        setPlanCode(d.subscription?.plan ?? null);
        setCreatorName(d.tenant.name);
        setOverviewData(d);
        import("@/actions/health.actions").then((mod) =>
          mod.getWebsiteHealthScore(d.tenant.id).then((h) => {
            if (h.success && h.score != null) setCompletionPct(h.score);
          })
        ).catch(() => {});
      }
    }).catch(() => {});
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
  }, [builderStore.isDirty, loading, currentThemeId, performSave]);

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

  const handleApplyTheme = useCallback(
    async (themeId: string) => {
      // Apply persists the theme + saves the draft (no publish).
      if (!themeId || !overviewData?.tenant.id) return;
      setPreviewThemeId(null);
      setCurrentThemeId(themeId);
      setThemeName(themeId);
      await performSave(themeId, currentThemeId);
      builderStore.markClean();
    },
    [performSave, currentThemeId, overviewData],
  );

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading composer...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950">
      <BuilderToolbar
        device={device}
        themeName={themeName}
        blueprintName={blueprintName}
        creatorName={creatorName}
        completionPct={completionPct}
        publishStatus={publishStatus}
        storefrontUrl={storefrontUrl}
        onDeviceChange={(d) => { setDevice(d); builderStore.setDevice(d); }}
        onSave={() => { setStatusMsg("Saving..."); performSave(previewThemeId, currentThemeId); }}
        saving={saving}
      />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} defaultWidth={280}>
          <BuilderSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} />
        </ResizablePanel>

          <div className="flex flex-1 flex-col overflow-hidden min-w-0">
            <div className="flex-1 overflow-auto">
              <InteractiveCanvas device={device} zoom={1} themePackageId={previewThemeId ?? currentThemeId ?? null} />
            </div>
          </div>

        <ResizablePanel side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)} defaultWidth={260}>
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

      <div className="flex h-8 items-center justify-between border-t border-white/5 bg-zinc-950 px-3 text-[10px] text-zinc-600 shrink-0">
        <div className="flex items-center gap-3">
          <span className={builderStore.isDirty ? "text-amber-400" : "text-emerald-400"}>
            {builderStore.isDirty ? "Unsaved changes" : "Draft saved"}
          </span>
          <span className="text-zinc-800">|</span>
          {statusMsg && <span className={statusMsg === "Saved" ? "text-emerald-400" : "text-red-400"}>{statusMsg}</span>}
        </div>
        <div className="flex items-center gap-3">
          <span className="text-zinc-700">v{builderStore.publish.version}</span>
          <span className="text-zinc-800">|</span>
          <button
            onClick={() => performSave(previewThemeId, currentThemeId)}
            disabled={saving}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            Save
          </button>
          <span className="text-zinc-800">|</span>
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
          <span className="text-zinc-800">|</span>
          <a href={storefrontUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
            <ExternalLink className="h-3 w-3" />
            View Live
          </a>
        </div>
      </div>
    </div>
  );
}


