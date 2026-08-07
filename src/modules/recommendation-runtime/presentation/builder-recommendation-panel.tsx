"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MousePointerClick, Loader2 } from "lucide-react";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { getRecommendations } from "@/actions/recommendation.actions";
import type { Recommendation } from "../domain/types";

const SEVERITY_BY_SCORE = (score: number): string =>
  score >= 60 ? "border-s8ul-cyan/25 text-s8ul-cyan hover:border-s8ul-cyan/50"
    : score >= 40 ? "border-amber-500/20 text-amber-300 hover:border-amber-500/40"
      : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white";

function selectedSectionModuleId(): string | null {
  const ids = builderStore.getSelectedIds();
  if (ids.length === 0) return null;
  const pageId = builderStore.canvas.activePageId;
  if (!pageId) return null;
  const section = builderStore.getSection(pageId, ids[0] as never);
  if (!section) return null;
  const moduleId = section.slots?.[0]?.moduleId;
  return moduleId ? String(moduleId).split(".")[0] : null;
}

export function BuilderRecommendationPanel() {
  const [selectedBase, setSelectedBase] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Recommendation[] | null>(null);

  useEffect(() => {
    const syncSelection = () => setSelectedBase(selectedSectionModuleId());
    syncSelection();
    const unsubSelection = builderEvents.subscribe("selection:changed", syncSelection);
    const unsubStore = builderEvents.subscribe("store:changed", syncSelection);
    return () => {
      unsubSelection();
      unsubStore();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    getRecommendations().then((result) => {
      if (!cancelled && result.success) setRecommendations(result.data ?? []);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const relevant = (recommendations ?? []).filter(
    (r) => r.actions.builder.moduleId && r.actions.builder.moduleId === selectedBase,
  );
  const general = (recommendations ?? []).filter((r) => !r.actions.builder.moduleId);
  const sectionShown = relevant.slice(0, 2);
  const generalShown = general.slice(0, 2);

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
        <MousePointerClick className="h-3 w-3 text-s8ul-cyan" />
        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
          {selectedBase ? "Recommended for this section" : "Recommended"}
        </p>
      </div>

      <div className="space-y-2 p-2">
        {recommendations === null && (
          <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            Analyzing…
          </div>
        )}

        {recommendations?.length === 0 && (
          <p className="px-1 py-2 text-[10px] text-zinc-500">No recommendations — your site is in great shape.</p>
        )}

        {sectionShown.map((recommendation) => (
          <Link
            key={recommendation.id}
            href={recommendation.actions.dashboard.href}
            className={`block rounded-lg border px-2.5 py-2 transition-colors ${SEVERITY_BY_SCORE(recommendation.score)}`}
          >
            <span className="flex items-center justify-between">
              <span className="text-[10px] font-medium">{recommendation.title}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
            </span>
            <span className="mt-0.5 block text-[10px] opacity-80 leading-snug">{recommendation.description}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-wider opacity-60">
              for {selectedBase} section · {recommendation.estimatedTime} min
            </span>
          </Link>
        ))}

        {sectionShown.length > 0 && generalShown.length > 0 && (
          <p className="px-1 pt-1 text-[9px] font-medium uppercase tracking-wider text-zinc-600">Also consider</p>
        )}

        {generalShown.map((recommendation) => (
          <Link
            key={recommendation.id}
            href={recommendation.actions.dashboard.href}
            className={`block rounded-lg border px-2.5 py-2 transition-colors ${SEVERITY_BY_SCORE(recommendation.score)}`}
          >
            <span className="flex items-center justify-between">
              <span className="text-[10px] font-medium">{recommendation.title}</span>
              <ArrowUpRight className="h-3 w-3 shrink-0 opacity-70" />
            </span>
            <span className="mt-0.5 block text-[10px] opacity-80 leading-snug">{recommendation.description}</span>
            <span className="mt-1 block text-[9px] uppercase tracking-wider opacity-60">
              {recommendation.categoryLabel} · {recommendation.estimatedTime} min
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
