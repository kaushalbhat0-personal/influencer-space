"use client";

import { useState, useCallback } from "react";
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

export function BuilderWorkspace() {
  useKeyboardShortcuts();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);
  const [device, setDevice] = useState<BuilderCanvasType["device"]>("desktop");
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);

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
        <BuilderStatusBar selectedCount={selectedCount} zoom={zoom} isDirty={isDirty} />
        <CanvasMinimap />
        <InlineEditorOverlay />
      </div>
    </InlineEditProvider>
  );
}
