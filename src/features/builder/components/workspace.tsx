"use client";

import { useState, useEffect, useRef } from "react";
import { ResizablePanel } from "./panel";
import { BuilderToolbar } from "./toolbar";
import { BuilderSidebar } from "./sidebar";
import { InteractiveCanvas } from "../canvas/interactive-canvas";
import { BuilderBreadcrumbs } from "../canvas/breadcrumbs";
import { CanvasMinimap } from "../canvas/minimap";
import { PropertyInspector } from "../inspector/panel";
import { InlineEditProvider } from "./inline-edit";
import { InlineEditorOverlay } from "../canvas/inline-editor-overlay";
import { BuilderStatusBar } from "./status-bar";
import { builderStore } from "@/lib/builder/store";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import { useKeyboardShortcuts } from "../shared/keyboard";
import { loadBuilderPages, saveBuilderPages } from "@/actions/builder.actions";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [device, setDevice] = useState<BuilderCanvasType["device"]>("desktop");
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [storefrontUrl, setStorefrontUrl] = useState("/");
  const [publishStatus, setPublishStatus] = useState<PublishStatusValue>("draft");
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
    ).catch((e: Error) => { console.error("[builder] Failed to fetch publish status", e); });
  }, []);

  useEffect(() => {
    if (!builderStore.isDirty || loading) return;
    if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(async () => {
      setSaving(true);
      setStatusMsg("Saving...");
      const pages = builderStore.serialize();
      const res = await saveBuilderPages(pages);
      if (res.success) {
        builderStore.markClean();
        setStatusMsg("Saved");
      } else {
        setStatusMsg("Save failed");
      }
      setSaving(false);
    }, 2000);
    return () => { if (autoSaveRef.current) clearTimeout(autoSaveRef.current); };
  }, [builderStore.isDirty, loading]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
          <p className="text-sm text-zinc-400">Loading builder...</p>
        </div>
      </div>
    );
  }

  return (
    <InlineEditProvider>
      <div className="flex h-screen flex-col bg-zinc-950">
        <BuilderToolbar
          device={device}
          zoom={zoom}
          showGrid={showGrid}
          storefrontUrl={storefrontUrl}
          publishStatus={publishStatus}
          onDeviceChange={setDevice}
          onZoomChange={setZoom}
          onToggleGrid={() => setShowGrid((v) => !v)}
          onSave={async () => {
            setSaving(true);
            setStatusMsg("Saving...");
            const pages = builderStore.serialize();
            const res = await saveBuilderPages(pages);
            if (res.success) {
              builderStore.markClean();
              setStatusMsg("Saved");
            } else {
              setStatusMsg("Save failed");
            }
            setSaving(false);
          }}
          saving={saving}
        />
        <div className="flex flex-1 overflow-hidden">
          <ResizablePanel side="left" collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)}>
            <BuilderSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed((v) => !v)} />
          </ResizablePanel>
          <div className="relative flex flex-1 flex-col overflow-hidden">
            <BuilderBreadcrumbs />
            <div className="flex-1 overflow-auto">
              <InteractiveCanvas
                device={device}
                zoom={zoom}
                showGrid={showGrid}
              />
            </div>
            <CanvasMinimap />
            <InlineEditorOverlay />
          </div>
          <ResizablePanel side="right" collapsed={rightCollapsed} onToggle={() => setRightCollapsed((v) => !v)}>
            <PropertyInspector />
          </ResizablePanel>
        </div>
        <BuilderStatusBar
          selectedCount={builderStore.canvas?.selectedElementIds?.size ?? 0}
          zoom={zoom}
          isDirty={builderStore.isDirty}
          saving={saving}
          statusMsg={statusMsg}
        />
      </div>
    </InlineEditProvider>
  );
}
