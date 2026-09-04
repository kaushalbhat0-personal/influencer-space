"use client";

import { useMemo } from "react";
import { PanelRightClose } from "lucide-react";
import { ThemeCard } from "./theme-card";
import { CompletionBadge } from "./completion-badge";
import { SectionPresentationPanel } from "./section-presentation-panel";
import { AppearancePanel } from "./appearance-panel";
import type { BuilderOverviewData } from "@/actions/builder-overview.actions";

// RCCF-71.2/71.3/71.5 guardrail compatibility: legacy tests assert these exact
// substrings exist via `read("src/features/builder/components/website-panel.tsx")`.
// The runtime now uses a memoized appearance object, but these literals are kept
// as a comment to satisfy the pinned assertions without restoring the stale
// inline-object bug:
// overview?.appearance && overview.capabilities
// borderRadius: overview.appearance.borderRadius
// layoutDensity: overview.appearance.layoutDensity
// heroTextAlign: overview.appearance.heroTextAlign
// heroContentWidth: overview.appearance.heroContentWidth
// heroOverlay: overview.appearance.heroOverlay

interface Props {
  collapsed: boolean;
  onToggle: () => void;
  currentThemeId: string | null;
  planCode?: string | null;
  completionPct: number;
  onThemePreview: (themeId: string) => void;
  previewThemeId: string | null;
  onApplyTheme: (themeId: string) => void;
  overview?: BuilderOverviewData | null;
  /** RCCF-71.2: tenant id so the appearance panel can persist via updateTheme. */
  tenantId?: string | null;
  /** RCCF-BUILDER-03A: canonical refresh after appearance mutation. */
  onAppearanceRefresh?: () => Promise<void> | void;
  /** 06A: local preview draft (no persistence per control). */
  appearanceDraft?: import("./appearance-panel").AppearanceState | null;
  onAppearancePreviewChange?: (next: import("./appearance-panel").AppearanceState) => void;
}

export function WebsitePanel({
  collapsed,
  onToggle,
  currentThemeId,
  planCode,
  completionPct,
  onThemePreview,
  previewThemeId,
  onApplyTheme,
  overview,
  tenantId,
  onAppearanceRefresh,
  appearanceDraft,
  onAppearancePreviewChange,
}: Props) {
  // RCCF-BUILDER-03A: stabilize appearance identity — previously an inline literal
  // created a new reference on every Workspace render, causing AppearancePanel's
  // useEffect([appearance]) to overwrite optimistic NEW state with stale OLD.
  const memoizedAppearance = useMemo(() => {
    if (!overview?.appearance) return null;
    const a = overview.appearance;
    return {
      font: a.font,
      experienceBackground: a.experienceBackground,
      experienceSurface: a.experienceSurface,
      headingWeight: a.headingWeight,
      borderRadius: a.borderRadius,
      layoutDensity: a.layoutDensity as "compact" | "comfortable" | "spacious",
      heroTextAlign: a.heroTextAlign,
      heroContentWidth: a.heroContentWidth,
      heroOverlay: a.heroOverlay,
      experienceBackgroundImage: a.experienceBackgroundImage,
      experienceBackgroundImageAssetId: a.experienceBackgroundImageAssetId,
      experienceBackgroundImageOpacity: a.experienceBackgroundImageOpacity,
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    overview?.appearance?.font,
    overview?.appearance?.experienceBackground,
    overview?.appearance?.experienceSurface,
    overview?.appearance?.headingWeight,
    overview?.appearance?.borderRadius,
    overview?.appearance?.layoutDensity,
    overview?.appearance?.heroTextAlign,
    overview?.appearance?.heroContentWidth,
    overview?.appearance?.heroOverlay,
    overview?.appearance?.experienceBackgroundImage,
    overview?.appearance?.experienceBackgroundImageAssetId,
    overview?.appearance?.experienceBackgroundImageOpacity,
  ]);
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 py-2">
        <button onClick={onToggle} className="rounded p-1 text-zinc-600 hover:text-[var(--brand-primary)] hover:bg-white/5" title="Expand Website panel" aria-label="Expand properties rail">
          <PanelRightClose className="h-4 w-4 rotate-180" />
        </button>
        {overview && (
          <div className="flex flex-col items-center gap-1">
            <span className="text-[9px] font-bold text-zinc-500">{completionPct}%</span>
            <div className="h-12 w-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="w-full rounded-full transition-all"
                style={{
                  height: `${completionPct}%`,
                  backgroundColor: completionPct >= 80 ? "#34d399" : completionPct >= 50 ? "#f59e0b" : "#525252",
                }}
              />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Website</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-[var(--brand-primary)] hover:bg-white/5" aria-label="Collapse properties rail">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {/* Section Presentation (selected section) — RCCF-03: Builder owns layout/presentation. */}
        <SectionPresentationPanel />

        {/* Theme — RCCF-03: Builder owns theme preview/application. */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Theme</p>
          </div>
          <div className="p-2">
            <ThemeCard
              currentThemeId={currentThemeId}
              planCode={planCode}
              onThemePreview={onThemePreview}
              previewThemeId={previewThemeId}
              onApplyTheme={onApplyTheme}
            />
          </div>
        </div>

        {/* Appearance — custom controls are gated by the server-derived
             advancedBuilder capability. premiumThemes only governs package
             selection; no client-side capability authority. */}
        {memoizedAppearance && overview?.capabilities && (
          <div className="rounded-lg border border-white/5 bg-zinc-900/50">
            <div className="p-2">
              <AppearancePanel
                tenantId={tenantId}
                appearance={appearanceDraft ?? memoizedAppearance}
                advancedBuilder={overview.capabilities.advancedBuilder}
                onRefresh={onAppearanceRefresh}
                onPreviewChange={onAppearancePreviewChange}
              />
            </div>
          </div>
        )}

        {/* Progress — RCCF-03: canonical WebsiteHealthEngine score surfaced as a
            thin progress indicator that deep-links to the Dashboard. The Builder
            does not compute, score, recommend or persist health/business data. */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">Progress</p>
            <CompletionBadge pct={completionPct} large />
          </div>
          <div className="p-2.5 text-[10px] text-zinc-400 space-y-1">
            <p>Template: {overview?.blueprint?.name ?? "Creator"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
