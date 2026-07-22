"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { ResizablePanel } from "./panel";
import { BuilderToolbar } from "./toolbar";
import { BuilderSidebar } from "./sidebar";
import { InteractiveCanvas } from "./canvas/interactive-canvas";
import { BuilderBreadcrumbs } from "./canvas/breadcrumbs";
import { CanvasMinimap } from "./canvas/minimap";
import { PropertyInspector } from "./property-inspector";
import { InlineEditProvider } from "./inline-edit";
import { InlineEditorOverlay } from "./canvas/inline-editor-overlay";
import { BuilderStatusBar } from "./status-bar";
import { builderStore } from "@/lib/builder/store";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import { useKeyboardShortcuts } from "./keyboard";
import { loadBuilderPages, saveBuilderPages, publishWebsite } from "@/actions/builder.actions";

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [device, setDevice] = useState<BuilderCanvasType["device"]>("desktop");
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [liveVersion, setLiveVersion] = useState<number | null>(null);
  const [statusMsg, setStatusMsg] = useState("");
  const autoSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load builder state from DB on mount
  useEffect(() => {
    loadBuilderPages().then((res) => {
      if (res.success && res.pages && res.pages.length > 0) {
        builderStore.hydrate(res.pages);
      }
      setLoading(false);
    });
  }, []);

  // Auto-save when isDirty changes (debounced)
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
      setTimeout(() => setStatusMsg(""), 2000);
    }, 2000);
    return () => {
      if (autoSaveRef.current) clearTimeout(autoSaveRef.current);
    };
  }, [builderStore.isDirty, loading]);

  const handlePublish = useCallback(async () => {
    setPublishing(true);
    setStatusMsg("Publishing...");
    const pages = builderStore.serialize();
    const res = await publishWebsite(pages);
    if (res.success) {
      builderStore.markClean();
      setLiveVersion(res.version ?? null);
      setStatusMsg(`Published v${res.version}`);
    } else {
      setStatusMsg("Publish failed");
    }
    setPublishing(false);
    setTimeout(() => setStatusMsg(""), 3000);
  }, []);

  const selectedCount = builderStore.selection.selectedIds.size;
  const isDirty = builderStore.isDirty;

  const handleDeviceChange = useCallback((d: BuilderCanvasType["device"]) => {
    setDevice(d);
    builderStore.setDevice(d);
  }, []);

  const handleZoomChange = useCallback((z: number) => {
    setZoom(z);
    builderStore.setZoom(z);
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-sm text-zinc-500">Loading workspace...</p>
      </div>
    );
  }

  return (
    <InlineEditProvider>
      <div className="flex h-screen flex-col bg-zinc-950 text-white">
        <BuilderToolbar device={device} zoom={zoom} onDeviceChange={handleDeviceChange} onZoomChange={handleZoomChange} showGrid={showGrid} onToggleGrid={() => setShowGrid(!showGrid)} />
        <BuilderBreadcrumbs />
        <div className="flex flex-1 overflow-hidden">
          <ResizablePanel side="left" defaultWidth={260} collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)}>
            <BuilderSidebar collapsed={leftCollapsed} onToggle={() => setLeftCollapsed(!leftCollapsed)} />
          </ResizablePanel>
          <InteractiveCanvas device={device} zoom={zoom} showGrid={showGrid} />
          <ResizablePanel side="right" defaultWidth={280} collapsed={rightCollapsed} onToggle={() => setRightCollapsed(!rightCollapsed)}>
            <PropertyInspector />
          </ResizablePanel>
        </div>
        <BuilderStatusBar selectedCount={selectedCount} zoom={zoom} isDirty={isDirty} saving={saving} statusMsg={statusMsg} onPublish={handlePublish} publishing={publishing} liveVersion={liveVersion} />
        <CanvasMinimap />
        <InlineEditorOverlay />
      </div>
    </InlineEditProvider>
  );
}
