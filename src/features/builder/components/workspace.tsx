"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ResizablePanel } from "./panel";
import { BuilderToolbar } from "./toolbar";
import { BuilderSidebar } from "./sidebar";
import { BuilderProperties } from "./properties";
import { InteractiveCanvas } from "../canvas/interactive-canvas";
import { builderStore } from "@/lib/builder/store";
import { builderPersistence } from "./persistence";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import { useKeyboardShortcuts } from "../shared/keyboard";
import { loadBuilderPages, saveBuilderPages } from "@/actions/builder.actions";
import { getBuilderOverview, type BuilderOverviewData } from "@/actions/builder-overview.actions";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { Upload, ExternalLink } from "lucide-react";

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const persisted = builderPersistence.load();

  const [leftCollapsed, setLeftCollapsed] = useState(persisted.sidebarCollapsed);
  const [rightCollapsed, setRightCollapsed] = useState(false);
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
        setCurrentThemeId(d.website.themePackageId);
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

  useEffect(() => {
    builderPersistence.save({ sidebarCollapsed: leftCollapsed, responsiveMode: device });
  }, [leftCollapsed, device]);

  useEffect(() => {
    if (!builderStore.isDirty || loading) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      setSaving(true);
      if (previewThemeId && previewThemeId !== currentThemeId) {
        const pages = builderStore.serialize();
        pages.forEach((p) => { p.theme = previewThemeId; });
        const res = await saveBuilderPages(pages);
        if (res.success) {
          builderStore.markClean();
          setCurrentThemeId(previewThemeId);
          setPreviewThemeId(null);
          setThemeName(previewThemeId);
          setStatusMsg("Saved");
        } else setStatusMsg("Save failed");
      } else {
        const pages = builderStore.serialize();
        const res = await saveBuilderPages(pages);
        if (res.success) { builderStore.markClean(); setStatusMsg("Saved"); }
        else setStatusMsg("Save failed");
      }
      setSaving(false);
    }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [builderStore.isDirty, loading, previewThemeId, currentThemeId]);

  const handleThemePreview = useCallback((themeId: string) => {
    setPreviewThemeId(themeId);
    builderStore.markDirty();
  }, []);

  const handleApplyTheme = useCallback(() => {
    if (previewThemeId) {
      setCurrentThemeId(previewThemeId);
      setThemeName(previewThemeId);
      setPreviewThemeId(null);
      builderStore.markDirty();
    }
  }, [previewThemeId]);

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
        onSave={async () => {
          setSaving(true);
          setStatusMsg("Saving...");
          const pages = builderStore.serialize();
          const res = await saveBuilderPages(pages);
          if (res.success) { builderStore.markClean(); setStatusMsg("Saved"); }
          else setStatusMsg("Save failed");
          setSaving(false);
        }}
        saving={saving}
      />

      <div className="flex flex-1 overflow-hidden">
        <ResizablePanel side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} defaultWidth={280}>
          <BuilderSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} />
        </ResizablePanel>

        <div className="flex flex-1 flex-col overflow-hidden min-w-0">
          <div className="flex-1 overflow-auto">
            <InteractiveCanvas device={device} zoom={1} />
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
            onClick={async () => {
              setSaving(true);
              const pages = builderStore.serialize();
              const res = await saveBuilderPages(pages);
              if (res.success) builderStore.markClean();
              setSaving(false);
            }}
            disabled={saving}
            className="flex items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-50"
          >
            <Upload className="h-3 w-3" />
            Save
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


