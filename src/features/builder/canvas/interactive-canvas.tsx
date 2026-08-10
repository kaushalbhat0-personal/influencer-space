"use client";

import { useEffect, useState, useReducer, useMemo, useCallback } from "react";
import { builderEvents } from "@/lib/builder/events";
import { ComponentRenderer } from "@/lib/renderer";
import { ComponentErrorBoundary } from "@/components/ui/ComponentErrorBoundary";
import { builderStore } from "@/lib/builder/store";
import { builderPagesToLayoutSnapshot, slotIdFromSectionId } from "@/lib/builder/layout";
import { layoutEngine } from "@/lib/storefront/layout-engine";
import { themeResolver } from "@/lib/theme/resolver-new";
import { themeRegistry } from "@/lib/theme/registry-new";
import { getLivePreviewData } from "@/actions/builder-preview.actions";
import { shouldRenderSection } from "@/modules/section-presentation";
import {
  experienceRegistry,
  ExperienceSection,
  resolveExperienceForCapabilities,
  THEME_EXPERIENCES,
} from "@/modules/theme/runtime/experience";
import type { PublishedSnapshot, LayoutSnapshot, ThemeSnapshot } from "@/types/snapshot";
import { traceRuntime, computeRuntimeSignature, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import type { ResolvedSnapshotTheme } from "@/lib/theme/resolver-new";

const DEVICE_WIDTHS: Record<string, number> = { mobile: 375, tablet: 768, desktop: 1200 };

const FALLBACK_THEME_ID = "com.creatos.neon-dark";

/**
 * Builder preview — renders through the SAME runtime as the storefront:
 * live aggregate → LayoutEngine → registry renderers. No placeholders, no
 * builder-only rendering. The preview always equals Published Blueprint
 * (theme + layout rules) + Current Draft (builder pages) + live content.
 */
export function InteractiveCanvas({
  device,
  zoom,
  themePackageId: themeOverride,
  onLiveContentChange,
}: {
  device: string;
  zoom: number;
  themePackageId?: string | null;
  /** RCCF-IMPLEMENTATION-74: share the fetched Website Aggregate with the
   * workspace so the sidebar renders canonical counts from the SAME payload —
   * zero extra queries, always in sync with the preview. */
  onLiveContentChange?: (content: PublishedSnapshot["content"] | null) => void;
}) {
  const [liveContent, setLiveContent] = useState<PublishedSnapshot["content"] | null>(null);
  const [fetchedThemePackageId, setFetchedThemePackageId] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});
  const [themeFonts, setThemeFonts] = useState<Record<string, string>>({});
  const [diagnostics, setDiagnostics] = useState<AggregateTraceDiagnostics>({
    invalidAssetIds: [], skippedAssets: 0, moduleFailures: [],
  });
  const [dataReady, setDataReady] = useState(false);
  const [previewPlanCode, setPreviewPlanCode] = useState<string | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);

  // Theme source: the workspace owns the authoritative theme state (current +
  // preview). The fetched theme is only a fallback until the overview loads.
  const themePackageId = themeOverride ?? fetchedThemePackageId ?? null;

  // Live CMS content — the builder NEVER owns content. This is the same
  // websiteAggregateService.build() the storefront uses; a refetch replaces
  // the canvas content with whatever the Dashboard/Admin wrote.
  const loadLiveContent = useCallback(async () => {
    const res = await getLivePreviewData();
    if (res.success && res.content) {
      const content = res.content as PublishedSnapshot["content"];
      setLiveContent(content);
      setFetchedThemePackageId(res.themePackageId ?? null);
      setThemeColors(res.themeColors ?? {});
      setThemeFonts(res.themeFonts ?? {});
      setDiagnostics(res.diagnostics ?? { invalidAssetIds: [], skippedAssets: 0, moduleFailures: [] });
      setPreviewPlanCode(res.planCode ?? null);
      onLiveContentChange?.(content);
    }
    setDataReady(true);
  }, [onLiveContentChange]);

  useEffect(() => {
    loadLiveContent();
  }, [loadLiveContent]);

  // Dashboard edits appear in the Builder immediately when the tab regains
  // focus — no publish, no reload, no preview step.
  // RCCF-LAUNCH-01: debounced — the focus/visibility refetch rebuilt the full
  // aggregate (~15 queries) on every tab switch / focus event.
  useEffect(() => {
    let focusTimer: ReturnType<typeof setTimeout> | null = null;
    const schedule = () => {
      if (focusTimer) clearTimeout(focusTimer);
      focusTimer = setTimeout(() => loadLiveContent(), 1500);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") schedule();
    };
    const onFocus = () => schedule();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    return () => {
      if (focusTimer) clearTimeout(focusTimer);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
    };
  }, [loadLiveContent]);

  // Keep the preview in lockstep with the store. Any store mutation re-renders
  // the canvas so Builder Preview always equals the draft the Sidebar shows.
  useEffect(() => {
    return builderEvents.subscribe("store:changed", () => forceRender());
  }, []);

  const storeHasSections = builderStore.canvas.pages.some((p) =>
    p.sections.some((s) => s.slots.length > 0),
  );

  // Pure signature of the current draft layout. `builderStore.serialize()` is
  // a fresh clone every render, so the memo below is keyed on this derived
  // signature — store state itself is never memoized.
  const serializedPages = builderStore.serialize();
  const layoutSignature = JSON.stringify(serializedPages.map((p) => ({
    id: p.id, slug: p.slug, isHome: p.isHome, order: p.order,
    sections: p.sections.map((s) => ({
      id: s.id, visible: s.visible,
      slots: s.slots.map((sl) => ({ moduleId: sl.moduleId, order: sl.order, visible: sl.visible, config: sl.config })),
    })),
  })));

  const resolved = useMemo(() => {
    if (!dataReady || !liveContent) return null;
    const hasOverrides = Object.keys(themeColors).length > 0 || Object.keys(themeFonts).length > 0;
    const resolvedTheme = themeResolver.resolveForSnapshot(
      themePackageId ?? FALLBACK_THEME_ID,
      "dark",
      hasOverrides ? {
        overrides: {
          colors: {
            primary: themeColors.primary as string | undefined,
            secondary: themeColors.secondary as string | undefined,
            accent: themeColors.accent as string | undefined,
            background: themeColors.background as string | undefined,
            foreground: themeColors.foreground as string | undefined,
            muted: themeColors.muted as string | undefined,
          },
          typography: {
            heading: themeFonts.heading as string | undefined,
            body: themeFonts.body as string | undefined,
          },
        } as Partial<ResolvedSnapshotTheme>,
      } : undefined,
    );
    const theme: ThemeSnapshot = {
      packageId: resolvedTheme?.packageId ?? themePackageId ?? FALLBACK_THEME_ID,
      colors: {
        primary: resolvedTheme?.colors.primary ?? "#6366F1",
        secondary: resolvedTheme?.colors.secondary ?? "#818CF8",
        accent: resolvedTheme?.colors.accent ?? "#A5B4FC",
        background: resolvedTheme?.colors.background ?? "#09090b",
        foreground: resolvedTheme?.colors.foreground ?? "#fafafa",
        muted: resolvedTheme?.colors.muted ?? "#a1a1aa",
        success: resolvedTheme?.colors.success,
        warning: resolvedTheme?.colors.warning,
        danger: resolvedTheme?.colors.danger,
        surface: resolvedTheme?.colors.surface,
        surfaceSecondary: resolvedTheme?.colors.surfaceSecondary,
        border: resolvedTheme?.colors.border,
        focus: resolvedTheme?.colors.focus,
        textSecondary: resolvedTheme?.colors.textSecondary,
      },
      typography: {
        heading: resolvedTheme?.typography.heading ?? "Inter",
        body: resolvedTheme?.typography.body ?? "Inter",
        mono: resolvedTheme?.typography.mono,
        display: resolvedTheme?.typography.display,
      },
    };
    const layout = builderPagesToLayoutSnapshot(serializedPages);
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
      layout,
      theme,
      navigation: [],
      renderingHints: {},
    };
    const doc = layoutEngine.resolve(snapshot);

    // RCCF-LAUNCH-TRACK-05: resolve the theme experience (backgrounds/effects)
    // exactly like the storefront, capability-filtered by the tenant's plan, so
    // the Builder preview and the live storefront render identically.
    const themeDef = themePackageId ? themeRegistry.getById(themePackageId) : undefined;
    const experience = resolveExperienceForCapabilities(
      experienceRegistry.resolve({
        id: themePackageId ?? null,
        category: themeDef?.category ?? null,
        premium: themeDef?.premium ?? null,
      }),
      previewPlanCode,
    );

    return {
      sections: doc.pages
        .flatMap((p) => p.sections)
        .filter((s) => s.visible !== false)
        // RCCF-LAUNCH-TRACK-04B: preview == storefront — empty/hidden sections
        // are removed from the canvas exactly like the live site.
        .filter((s) => shouldRenderSection(s.config as Record<string, unknown>)),
      theme,
      themeVars: doc.theme,
      layout,
      experience,
    };
    // serializedPages is derived 1:1 from layoutSignature — never memoize store state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataReady, liveContent, themePackageId, layoutSignature, themeColors, themeFonts, previewPlanCode]);

  const sections = resolved?.sections ?? [];
  const experience = resolved?.experience ?? THEME_EXPERIENCES.minimal;

  // Emit the SAME runtime trace + Runtime Signature as storefront/publish, so
  // the builder preview can be compared bit-for-bit against production.
  const signature = dataReady && liveContent && resolved
    ? computeRuntimeSignature({ theme: resolved.theme, layout: resolved.layout, aggregate: liveContent })
    : "";
  useEffect(() => {
    if (!dataReady || !liveContent || !resolved) return;
    traceRuntime({
      runtimeType: "builder",
      creator: liveContent.identity?.name || "",
      theme: resolved.theme,
      layout: resolved.layout,
      aggregate: liveContent,
      slug: null,
      storeVersion: builderStore.storeVersion,
      timings: { resolveMs: 0 },
      diagnostics,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, dataReady, liveContent, resolved, diagnostics]);

  return (
    <div className="relative flex-1 overflow-auto bg-[var(--surface-root,#0A0A0B)]" data-testid="builder-canvas" data-runtime-signature={signature}>
      <div className="flex min-h-full items-start justify-center p-8">
        <div
          // RCCF-RESPONSIVE-02: the device frame is the @container ancestor so
          // container-query breakpoint variants (@sm/@lg) in renderers respond
          // to the FRAME width (375/768/1200) instead of the outer browser
          // window — the mobile frame now renders the same base classes as the
          // live storefront at 375px. shrink-0 keeps the desktop frame at its
          // full 1200px (a shrinking flex item would otherwise drop below the
          // @lg threshold and lose its desktop styling).
          className="@container relative shrink-0 overflow-hidden rounded-lg border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-root,#0A0A0B)] shadow-2xl shadow-black/50 transition-all"
          style={{ width: DEVICE_WIDTHS[device] ?? 1200, transform: `scale(${zoom})`, transformOrigin: "top center", ...(resolved?.themeVars as React.CSSProperties | undefined) }}
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

            {dataReady && !storeHasSections && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
                <p className="max-w-xs text-xs text-zinc-600">Add sections from the left sidebar to get started.</p>
              </div>
            )}

            {dataReady && storeHasSections && sections.length === 0 && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-16 w-16 rounded-full bg-zinc-800" />
                <h2 className="text-sm font-semibold text-zinc-300">Your Website Preview</h2>
                <p className="max-w-xs text-xs text-zinc-600">
                  Preview data is still loading. If this persists, check your site content or refresh.
                </p>
              </div>
            )}

            {sections.map((section, i) => {
              const slotId = slotIdFromSectionId(section.id);
              const isFirst = i === 0;
              const isLast = i === sections.length - 1;
              const sectionVariant: "hero" | "footer" | "default" = isFirst ? "hero" : isLast ? "footer" : "default";
              return (
                // RCCF-LAUNCH-TRACK-05: the Builder preview now renders the SAME
                // ExperienceSection (backgrounds/effects/dividers) as the live
                // storefront, so previews accurately represent the theme.
                <ExperienceSection
                  key={section.id}
                  id={section.moduleId?.split(".")[0] ?? `section-${i}`}
                  experience={experience}
                  index={i}
                  variant={sectionVariant}
                  divider="bottom"
                  data-testid={`builder-experience-${i}`}
                >
                  <div data-element-id={slotId} data-module={section.moduleId} className="relative">
                    <ComponentErrorBoundary componentId={section.moduleId}>
                      <ComponentRenderer
                        componentId={section.moduleId}
                        props={section.config}
                        elementId={slotId}
                        viewport={builderStore.canvas.device}
                        previewMode
                      />
                    </ComponentErrorBoundary>
                  </div>
                </ExperienceSection>
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
}
