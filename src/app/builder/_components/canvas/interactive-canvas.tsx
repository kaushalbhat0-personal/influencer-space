"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { BuilderCanvas as BuilderCanvasType } from "@/lib/builder/types";
import { builderQuery } from "@/lib/builder/query";
import { builderCommands } from "@/lib/builder/commands";
import { builderEvents } from "@/lib/builder/events";
import { dragController } from "@/lib/builder/drag";
import { propertyResolver } from "@/lib/builder/properties";
import { useInlineEdit } from "../inline-edit";
import { SelectionOverlay } from "./selection-overlay";
import { HoverOverlay } from "./hover-overlay";
import { SelectionBox } from "./selection-box";
import { CanvasGrid } from "./grid";
import { DragOverlay } from "./drag-overlay";

type Device = BuilderCanvasType["device"];

const DEVICE_WIDTHS: Record<Device, number> = { mobile: 375, tablet: 768, desktop: 1200 };

export function InteractiveCanvas({
  device,
  zoom,
  showGrid,
}: {
  device: Device;
  zoom: number;
  showGrid: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const dragRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number; elementId: string } | null>(null);
  const DRAG_THRESHOLD = 3;
  const inlineEdit = useInlineEdit();

  const selection = builderQuery.getSelection();
  const hierarchy = builderQuery.getCanvasHierarchy();
  const slotElements = hierarchy.slots.filter((s) => s.visible);

  useEffect(() => {
    const handler = () => {};
    const unsubs = [
      builderEvents.subscribe("node:selected", handler),
      builderEvents.subscribe("node:deselected", handler),
      builderEvents.subscribe("node:inserted", handler),
      builderEvents.subscribe("node:deleted", handler),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (dragRef.current) return;
    if (e.target === containerRef.current || (e.target as HTMLElement).dataset.canvasBg) {
      builderCommands.execute("deselect", null);
    }
    setContextMenu(null);
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) setContextMenu({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (dragStartRef.current && !dragRef.current) {
      const dx = Math.abs(e.clientX - dragStartRef.current.x);
      const dy = Math.abs(e.clientY - dragStartRef.current.y);
      if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (rect) {
          const result = dragController.begin(dragStartRef.current.elementId, dragStartRef.current.x, dragStartRef.current.y, rect.width, rect.height);
          if (result.allowed) dragRef.current = true;
        }
      }
    }
    if (dragRef.current && dragController.active) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (rect) dragController.update(e.clientX, e.clientY, rect.width, rect.height, { shift: e.shiftKey, alt: e.altKey, ctrl: e.ctrlKey });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (dragRef.current) {
      if (dragController.active) dragController.complete();
      dragRef.current = false;
    }
    dragStartRef.current = null;
  }, []);

  const handleModuleMouseDown = useCallback((elementId: string, e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragStartRef.current = { x: e.clientX, y: e.clientY, elementId };
    e.preventDefault();
  }, []);

  const handleModuleClick = useCallback((elementId: string, e: React.MouseEvent) => {
    if (dragRef.current) return;
    e.stopPropagation();
    const multi = e.shiftKey || e.ctrlKey || e.metaKey;
    builderCommands.execute("selectNode", { elementId, multi });
  }, []);

  const handleModuleHover = useCallback((elementId: string | null) => {
    setHoveredId(elementId);
  }, []);

  const handleModuleDoubleClick = useCallback((elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const resolved = propertyResolver.resolve(elementId);
    const firstTextProp = resolved.properties.find((p) => p.editorType === "string" || p.editorType === "text" || p.editorType === "url" || p.editorType === "image");
    if (firstTextProp) {
      const el = document.querySelector(`[data-element-id="${elementId}"]`);
      if (el) inlineEdit.startEditing(elementId, firstTextProp, el.getBoundingClientRect());
    }
  }, [inlineEdit]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-auto bg-zinc-900/50"
      onClick={handleCanvasClick}
      onContextMenu={handleContextMenu}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <SelectionBox containerRef={containerRef} />

      <div className="flex min-h-full items-start justify-center p-8">
        <div
          className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 transition-all"
          style={{ width: DEVICE_WIDTHS[device], transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          {showGrid && <CanvasGrid />}
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-[10px] text-zinc-600">{DEVICE_WIDTHS[device]}px</span>
          </div>

          <div className="relative min-h-[600px] p-4">
            {slotElements.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center" data-canvas-bg="true">
                <div className="h-16 w-16 rounded-full bg-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
                <p className="max-w-xs text-xs text-zinc-600">Add modules from the left sidebar to start building.</p>
              </div>
            )}

            {slotElements.map((slot) => (
              <div
                key={slot.id}
                data-element-id={slot.id}
                data-module={slot.moduleId}
                className="relative mb-2 cursor-grab rounded border border-transparent transition-colors hover:border-s8ul-cyan/30 active:cursor-grabbing"
                onClick={(e) => handleModuleClick(slot.id, e)}
                onMouseDown={(e) => handleModuleMouseDown(slot.id, e)}
                onDoubleClick={(e) => handleModuleDoubleClick(slot.id, e)}
                onMouseEnter={() => handleModuleHover(slot.id)}
                onMouseLeave={() => handleModuleHover(null)}
              >
                <div className="flex items-center gap-2 rounded bg-zinc-900/80 px-3 py-2">
                  <div className="h-6 w-6 rounded bg-zinc-800" />
                  <div>
                    <p className="text-xs font-medium text-zinc-400">{slot.moduleId.split(".").pop()}</p>
                    <p className="text-[10px] text-zinc-600">{slot.id}</p>
                  </div>
                </div>
              </div>
            ))}

            <SelectionOverlay selectedIds={selection.ids} slots={slotElements} containerRef={containerRef} device={device} zoom={zoom} />
            <HoverOverlay hoveredId={hoveredId} slots={slotElements} containerRef={containerRef} device={device} zoom={zoom} />
          </div>
        </div>
      </div>

      <DragOverlay containerRef={containerRef} zoom={zoom} />

      {contextMenu && (
        <div className="absolute z-50 rounded-lg border border-white/10 bg-zinc-900 p-1 shadow-xl" style={{ left: contextMenu.x, top: contextMenu.y }}>
          {["Select All", "Deselect", "Copy", "Paste", "Delete"].map((label) => (
            <button key={label} className="block w-full rounded px-3 py-1.5 text-left text-xs text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200">
              {label}
            </button>
          ))}
        </div>
      )}

      {device !== "desktop" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {DEVICE_WIDTHS[device]}px · {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
}
