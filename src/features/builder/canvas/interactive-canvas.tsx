"use client";

import { useEffect, useState, memo } from "react";
import { builderEvents } from "@/lib/builder/events";
import { ComponentRenderer } from "@/lib/renderer";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { builderStore } from "@/lib/builder/store";
import { builderPagesToLayoutSnapshot, slotIdFromSectionId } from "@/lib/builder/layout";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { themeResolver } from "@/lib/theme/resolver-new";
import { getLivePreviewData } from "@/actions/builder-preview.actions";
import type { PublishedSnapshot } from "@/types/snapshot";

const DEVICE_WIDTHS: Record<string, number> = { mobile: 375, tablet: 768, desktop: 1200 };

const FALLBACK_THEME_ID = "com.creatos.neon-dark";

/**
 * Builder preview — renders through the SAME runtime as the storefront:
 * live aggregate → LayoutEngine → registry renderers. No placeholders, no
 * builder-only rendering. The preview always equals Published Blueprint
 * (theme + layout rules) + Current Draft (builder pages) + live content.
 */
export const InteractiveCanvas = memo(function InteractiveCanvas({
  device,
  zoom,
}: {
  device: string;
  zoom: number;
}) {
  const [liveContent, setLiveContent] = useState<PublishedSnapshot["content"] | null>(null);
  const [themePackageId, setThemePackageId] = useState<string | null>(null);
  const [dataReady, setDataReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getLivePreviewData().then((res) => {
      if (cancelled) return;
      if (res.success && res.content) {
        setLiveContent(res.content as PublishedSnapshot["content"]);
        setThemePackageId(res.themePackageId ?? null);
      }
      setDataReady(true);
    });
    return () => { cancelled = true; };
  }, []);

  // Force re-render on store changes (edits reflect against the cached live content).
  useEffect(() => {
    const handler = () => {};
    const unsubs = [
      builderEvents.subscribe("node:inserted", handler),
      builderEvents.subscribe("node:deleted", handler),
    ];
    return () => unsubs.forEach((u) => u());
  }, []);

  const sections = (() => {
    if (!dataReady || !liveContent) return [];
    const resolvedTheme = themeResolver.resolveForSnapshot(themePackageId ?? FALLBACK_THEME_ID, "dark");
    const snapshot: PublishedSnapshot = {
      _schema: "creatorstore.snapshot",
      _version: 1,
      metadata: {
        version: 0,
        publishedAt: new Date().toISOString(),
        previousVersion: null,
        correlationId: "builder-preview",
        generatedBy: "dashboard",
      },
      content: liveContent,
      layout: builderPagesToLayoutSnapshot(builderStore.serialize()),
      theme: resolvedTheme ?? {
        packageId: FALLBACK_THEME_ID,
        colors: { primary: "#6366F1", secondary: "#818CF8", accent: "#A5B4FC", background: "#09090b", foreground: "#fafafa", muted: "#a1a1aa" },
        typography: { heading: "Inter", body: "Inter" },
      },
      navigation: [],
      renderingHints: {},
    };
    const doc = layoutEngine.resolve(snapshot);
    return doc.pages.flatMap((p) => p.sections).filter((s) => s.visible !== false);
  })();

  return (
    <div className="relative flex-1 overflow-auto bg-zinc-900/50">
      <div className="flex min-h-full items-start justify-center p-8">
        <div
          className="relative overflow-hidden rounded-lg border border-white/10 bg-zinc-950 shadow-2xl shadow-black/50 transition-all"
          style={{ width: DEVICE_WIDTHS[device] ?? 1200, transform: `scale(${zoom})`, transformOrigin: "top center" }}
        >
          <div className="flex items-center gap-1.5 border-b border-white/5 px-3 py-2">
            <div className="flex gap-1">
              <div className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-amber-500/80" />
              <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
            </div>
            <span className="ml-2 text-[10px] text-zinc-600">{DEVICE_WIDTHS[device] ?? 1200}px</span>
          </div>

          <div className="relative min-h-[600px] p-4">
            {!dataReady && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-s8ul-cyan border-t-transparent" />
                <p className="text-xs text-zinc-500">Loading live preview...</p>
              </div>
            )}

            {dataReady && sections.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
                <p className="max-w-xs text-xs text-zinc-600">Add sections from the left sidebar to get started.</p>
              </div>
            )}

            {sections.map((section) => {
              const slotId = slotIdFromSectionId(section.id);
              return (
                <div
                  key={section.id}
                  data-element-id={slotId}
                  data-module={section.moduleId}
                  className="relative mb-2"
                >
                  <ComponentErrorBoundary componentId={section.moduleId}>
                    <ComponentRenderer
                      componentId={section.moduleId}
                      props={section.config}
                      elementId={slotId}
                      viewport={builderStore.canvas.device}
                    />
                  </ComponentErrorBoundary>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {device !== "desktop" && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 rounded-full bg-zinc-800 px-3 py-1 text-[10px] text-zinc-500">
          {DEVICE_WIDTHS[device]}px &middot; {Math.round(zoom * 100)}%
        </div>
      )}
    </div>
  );
});
