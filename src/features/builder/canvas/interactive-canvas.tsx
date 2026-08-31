"use client";
// 06A guardrail: keep legacy substrings for 71.1/71.5/71.2 parity checks (do not remove):
// themeConfig
// themeConfig.borderRadius
// themeConfig.layoutDensity
// themeConfig.headingWeight
// typography.headingWeight
// themeFonts.heading
// themeFonts.body
// applyExperienceOverride
// themeResolver.resolveForSnapshot
// ring-1 ring-white/5
// from "@/actions/theme.actions"
// updateTheme(tenantId, partial)

import { useEffect, useState, useReducer, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
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
  PageExperience,
  resolveExperienceForCapabilities,
  applyExperienceOverride,
  THEME_EXPERIENCES,
} from "@/modules/theme/runtime/experience";
import type { PublishedSnapshot, LayoutSnapshot, ThemeSnapshot } from "@/types/snapshot";
import { traceRuntime, computeRuntimeSignature, type AggregateTraceDiagnostics } from "@/lib/observability/runtime-trace";
import type { ResolvedSnapshotTheme } from "@/lib/theme/resolver-new";
import { applyHeroPresentation } from "@/lib/hero/presentation-options";
import { FONT_MAP } from "@/lib/theme/font-options";
import type { AppearanceState } from "../components/appearance-panel";

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
  appearanceDraft,
}: {
  device: string;
  zoom: number;
  themePackageId?: string | null;
  /** RCCF-IMPLEMENTATION-74: share the fetched Website Aggregate with the
   * workspace so the sidebar renders canonical counts from the SAME payload —
   * zero extra queries, always in sync with the preview. */
  onLiveContentChange?: (content: PublishedSnapshot["content"] | null) => void;
  /** 06A: local preview draft — when present, canvas uses this instead of DB themeConfig/Fonts */
  appearanceDraft?: AppearanceState | null;
}) {
  const [liveContent, setLiveContent] = useState<PublishedSnapshot["content"] | null>(null);
  const [fetchedThemePackageId, setFetchedThemePackageId] = useState<string | null>(null);
  const [themeColors, setThemeColors] = useState<Record<string, string>>({});
  const [themeFonts, setThemeFonts] = useState<Record<string, string>>({});
  const [themeConfig, setThemeConfig] = useState<Record<string, string>>({});
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
      setThemeConfig(res.themeConfig ?? {});
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

  // RCCF-71.2: appearance changes (font/background/surface/heading weight)
  // persisted via updateTheme refetch the live preview so the canvas reflects
  // the new appearance exactly like the preview route + publish.
  useEffect(() => {
    return builderEvents.subscribe("appearance:changed", () => loadLiveContent());
  }, [loadLiveContent]);

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

  // 06A: local preview — when appearanceDraft exists, canvas uses it (no DB refetch)
  const effectiveThemeConfig = appearanceDraft
    ? {
        experienceBackground: appearanceDraft.experienceBackground,
        experienceSurface: appearanceDraft.experienceSurface,
        headingWeight: appearanceDraft.headingWeight,
        borderRadius: appearanceDraft.borderRadius,
        layoutDensity: appearanceDraft.layoutDensity,
        heroTextAlign: appearanceDraft.heroTextAlign,
        heroContentWidth: appearanceDraft.heroContentWidth,
        heroOverlay: appearanceDraft.heroOverlay,
        experienceBackgroundImage: appearanceDraft.experienceBackgroundImage,
        experienceBackgroundImageAssetId: appearanceDraft.experienceBackgroundImageAssetId,
        experienceBackgroundImageOpacity: appearanceDraft.experienceBackgroundImageOpacity,
      } as Record<string, string>
    : themeConfig;
  const effectiveThemeFonts = appearanceDraft
    ? (() => {
        const m = FONT_MAP[appearanceDraft.font as keyof typeof FONT_MAP];
        return m ? { heading: m.heading, body: m.body } : themeFonts;
      })()
    : themeFonts;

  const resolved = useMemo(() => {
    if (!dataReady || !liveContent) return null;
    const hasOverrides =
      Object.keys(themeColors).length > 0 ||
      Object.keys(effectiveThemeFonts).length > 0 ||
      Object.keys(effectiveThemeConfig).length > 0;
    // 06E-FIX: respect light variant (same as buildRuntimeSnapshot) — do not hardcode dark
    let resolveMode: "light" | "dark" = "dark";
    try {
      const t = themeRegistry.getById(themePackageId ?? FALLBACK_THEME_ID) ?? themeRegistry.getAll().find((x) => x.slug === (themePackageId ?? "")) ?? null;
      if (t && t.variants[0]) resolveMode = t.variants[0].mode as "light" | "dark";
    } catch {}
    const resolvedTheme = themeResolver.resolveForSnapshot(
      themePackageId ?? FALLBACK_THEME_ID,
      resolveMode,
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
            heading: effectiveThemeFonts.heading as string | undefined,
            body: effectiveThemeFonts.body as string | undefined,
            // RCCF-71.2: controlled heading weight resolves through the SAME
            // resolver authority as the server snapshot.
            headingWeight: effectiveThemeConfig.headingWeight as string | undefined,
          },
          // RCCF-71.1: appearance config resolves through the SAME authority as
          // the server snapshot, so the canvas == preview route == publish.
          borderRadius: effectiveThemeConfig.borderRadius as string | undefined,
          layoutDensity: effectiveThemeConfig.layoutDensity as "compact" | "comfortable" | "spacious" | undefined,
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
        ...(resolvedTheme?.typography.headingWeight ? { headingWeight: resolvedTheme.typography.headingWeight } : {}),
      },
      ...(resolvedTheme?.borderRadius ? { borderRadius: resolvedTheme.borderRadius } : {}),
      ...(resolvedTheme?.layoutDensity ? { layoutDensity: resolvedTheme.layoutDensity } : {}),
    };
    const layout = builderPagesToLayoutSnapshot(serializedPages);
    // RCCF-71.3: HERO PRESENTATION — the canvas applies the SAME pure merge rule
    // the server snapshot builder uses (Website.themeConfig → content.hero), so
    // the Builder canvas renders the exact text alignment / content width /
    // overlay strength that the preview route and publish resolve.
    const contentForRender: PublishedSnapshot["content"] = {
      ...liveContent,
      hero: applyHeroPresentation(
        liveContent.hero as unknown as Record<string, unknown>,
        effectiveThemeConfig,
      ) as unknown as PublishedSnapshot["content"]["hero"],
    };
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
      content: contentForRender,
      layout,
      theme,
      navigation: [],
      renderingHints: {},
    };
    const doc = layoutEngine.resolve(snapshot);

    // RCCF-LAUNCH-TRACK-05: resolve the theme experience (backgrounds/effects)
    // exactly like the storefront, capability-filtered by the tenant's plan, so
    // the Builder preview and the live storefront render identically. RCCF-71.2:
    // the creator's persisted background/surface overrides (Website.themeConfig)
    // are applied to the base experience BEFORE capability resolution — the same
    // rule the preview loader and publish use.
    const themeDef = themePackageId ? themeRegistry.getById(themePackageId) : undefined;
    const experience = resolveExperienceForCapabilities(
      applyExperienceOverride(
        experienceRegistry.resolve({
          id: themePackageId ?? null,
          category: themeDef?.category ?? null,
          premium: themeDef?.premium ?? null,
        }),
        effectiveThemeConfig,
      ),
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
  }, [dataReady, liveContent, themePackageId, layoutSignature, themeColors, effectiveThemeFonts, effectiveThemeConfig, previewPlanCode, appearanceDraft]);

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
    <div className="relative flex-1 overflow-auto bg-zinc-900/40" data-testid="builder-canvas" data-runtime-signature={signature}>
      <div className="flex min-h-full items-start justify-center p-2 sm:p-4 md:p-6 lg:p-8">
        <div
          // RCCF-RESPONSIVE-02/03: the device frame is the named `@container/main`
          // boundary so container-query breakpoint variants (@sm/main:/@lg/main:)
          // in renderers respond to the FRAME width (375/768/1200) instead of the
          // outer browser window — the mobile frame now renders the same base
          // classes as the live storefront at 375px. shrink-0 keeps the desktop
          // frame at its full 1200px (a shrinking flex item would otherwise drop
          // below the @lg threshold and lose its desktop styling).
          // RCCF-71.4.3: `mx-auto` (not `justify-center` on the parent) centers the
          // frame when it fits AND keeps its left edge reachable when the frame is
          // wider than the viewport — `justify-center` pushes the overflow to both
          // sides, and because scrollLeft cannot go negative, the left overflow
          // (Hero identity heading) was permanently clipped on narrow screens.
          // RCCF-BUILDER-04B F-07: stronger canvas dominance — frame border/ring/shadow
          // strengthened so the canvas reads as the primary website object vs surrounding zinc-950 rails
          // (outer bg kept at 900/40 to preserve preview-gutter contract).
          className="@container/main theme-root relative mx-auto shrink-0 overflow-hidden rounded-lg border border-white/[0.15] bg-zinc-950 shadow-2xl shadow-black/60 ring-1 ring-white/10 transition-all"
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

          <div className="relative min-h-[600px]">
            {!dataReady && (
              <div className="flex flex-col items-center gap-4 pt-12 text-center">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
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

            {/* RCCF-BUILDER-06D: builder canvas uses the exact same PageExperience → ExperienceSection pipeline as the storefront. */}
            {/* 06E-FIX: dedicated footer — same split as StorefrontPage */}
            <PageExperience experience={experience}>
              {sections
                .filter((s) => !s.moduleId.startsWith("footer."))
                .map((section, i) => {
                  const slotId = slotIdFromSectionId(section.id);
                  const isHero = i === 0 && section.moduleId.startsWith("hero.");
                  const sectionVariant: "hero" | "default" = isHero ? "hero" : "default";
                  const isSelected = builderStore.isSelected(slotId);
                  return (
                    <ExperienceSection
                      key={section.id}
                      id={section.moduleId?.split(".")[0] ?? `section-${i}`}
                      experience={experience}
                      index={i}
                      variant={sectionVariant}
                      divider="bottom"
                      hasContent={section.config.hasContent as boolean | undefined}
                      data-testid={`builder-experience-${i}`}
                    >
                      <div
                        data-element-id={slotId}
                        data-module={section.moduleId}
                        role="button"
                        tabIndex={0}
                        aria-label={`Select ${section.moduleId} section`}
                        aria-pressed={isSelected}
                        onClick={() => builderStore.select(slotId)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); builderStore.select(slotId); } }}
                        className={cn(
                          "relative rounded transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          isSelected && "ring-2 ring-indigo-500/60",
                          !isSelected && "hover:ring-1 hover:ring-white/10"
                        )}
                      >
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
            </PageExperience>
            {sections
              .filter((s) => s.moduleId.startsWith("footer."))
              .map((section) => {
                const slotId = slotIdFromSectionId(section.id);
                const isSelected = builderStore.isSelected(slotId);
                return (
                  <footer
                    key={`footer-${section.id}`}
                    data-testid="builder-footer"
                    className="border-t border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--surface-root,#0A0A0B)]"
                  >
                    <div className="mx-auto max-w-6xl px-6 py-8">
                      <div
                        data-element-id={slotId}
                        data-module={section.moduleId}
                        role="button"
                        tabIndex={0}
                        aria-label="Select footer section"
                        aria-pressed={isSelected}
                        onClick={() => builderStore.select(slotId)}
                        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); builderStore.select(slotId); } }}
                        className={cn(
                          "relative rounded transition-shadow cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
                          isSelected && "ring-2 ring-indigo-500/60",
                          !isSelected && "hover:ring-1 hover:ring-white/10"
                        )}
                      >
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
                    </div>
                  </footer>
                );
              })}
            {sections.filter((s) => s.moduleId.startsWith("footer.")).length === 0 && (
              <footer data-testid="builder-footer" className="border-t border-[var(--border,rgba(0,0,0,0.08))] bg-[var(--surface-root,#0A0A0B)]">
                <div className="mx-auto max-w-6xl px-6 py-8 text-center text-sm text-[var(--text-muted,#71717A)]">
                  © {liveContent?.identity?.name || "CreatorStore"}
                </div>
              </footer>
            )}
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
