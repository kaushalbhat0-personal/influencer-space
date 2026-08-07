"use client";

import { PanelRightClose } from "lucide-react";
import { ThemeCard } from "./theme-card";
import { CompletionBadge } from "./completion-badge";
import { BuilderCompletionHints } from "@/modules/knowledge-runtime/presentation/builder-hints";
import { GoalBuilderSuggestions } from "@/modules/goals-runtime/presentation/goal-builder-suggestions";
import { BuilderRecommendationPanel } from "@/modules/recommendation-runtime/presentation/builder-recommendation-panel";
import type { BuilderOverviewData } from "@/actions/builder-overview.actions";

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
}

export function WebsitePanel({
  collapsed, onToggle, currentThemeId, planCode, completionPct,
  onThemePreview, previewThemeId, onApplyTheme, overview,
}: Props) {
  if (collapsed) {
    return (
      <div className="flex h-full flex-col items-center gap-2 py-2">
        <button onClick={onToggle} className="rounded p-1 text-zinc-600 hover:text-zinc-400" title="Expand Website panel">
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
      <div className="flex items-center justify-between border-b border-white/5 px-3 py-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Website</span>
        <button onClick={onToggle} className="rounded p-0.5 text-zinc-600 hover:text-zinc-400">
          <PanelRightClose className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 p-2">
        {/* Theme */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Theme</p>
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

        {/* Progress */}
        <div className="rounded-lg border border-white/5 bg-zinc-900/50">
          <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-white/5">
            <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Progress</p>
            <CompletionBadge pct={completionPct} large />
          </div>
          <div className="p-2.5 text-[10px] text-zinc-400 space-y-1">
            <p>Template: {overview?.blueprint?.name ?? "Creator"}</p>
          </div>
        </div>

        {/* Completion hints */}
        <BuilderCompletionHints />

        {/* Goal recommendations */}
        <GoalBuilderSuggestions />

        {/* Section recommendations */}
        <BuilderRecommendationPanel />
      </div>
    </div>
  );
}
