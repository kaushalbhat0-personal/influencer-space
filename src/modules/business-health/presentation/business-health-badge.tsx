"use client";

import { useEffect, useState } from "react";
import { HeartPulse, Loader2 } from "lucide-react";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { getBuilderBusinessHealth } from "@/actions/business-health.actions";
import { SECTION_HEALTH_CONTRIBUTION } from "../domain/registry";
import type { HealthDimensionId } from "../domain/types";

const DIMENSION_LABELS: Record<HealthDimensionId, string> = {
  knowledge: "Knowledge",
  goal_alignment: "Goal",
  storefront_quality: "Storefront",
  success_progress: "Success",
  commerce_readiness: "Commerce",
  brand: "Brand",
  trust: "Trust",
  seo: "SEO",
  platform_configuration: "Config",
  recommendation_adoption: "Recs",
  performance: "Perf",
  future_ready: "Future",
};

function selectedSectionBase(): string | null {
  const ids = builderStore.getSelectedIds();
  if (ids.length === 0) return null;
  const pageId = builderStore.canvas.activePageId;
  if (!pageId) return null;
  const section = builderStore.getSection(pageId, ids[0] as never);
  const moduleId = section?.slots?.[0]?.moduleId;
  return moduleId ? String(moduleId).split(".")[0] : null;
}

export function BusinessHealthBadge() {
  const [health, setHealth] = useState<{ overall: number; grade: string } | null>(null);
  const [selectedBase, setSelectedBase] = useState<string | null>(null);

  useEffect(() => {
    const syncSelection = () => setSelectedBase(selectedSectionBase());
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
    getBuilderBusinessHealth().then((result) => {
      if (!cancelled && result.success && result.data) setHealth(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const contributions = selectedBase ? SECTION_HEALTH_CONTRIBUTION[selectedBase] ?? [] : [];

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
        <HeartPulse className="h-3 w-3 text-emerald-400" />
        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Website Health</p>
        {health === null ? (
          <Loader2 className="ml-auto h-3 w-3 animate-spin text-zinc-600" />
        ) : (
          <span className="ml-auto text-[11px] font-bold text-emerald-400">
            {health.overall}% · {health.grade}
          </span>
        )}
      </div>
      <div className="p-2">
        {selectedBase ? (
          <div className="flex flex-wrap gap-1">
            {contributions.length > 0 ? (
              contributions.map((id) => (
                <span key={id} className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400">
                  {DIMENSION_LABELS[id]}
                </span>
              ))
            ) : (
              <span className="text-[9px] text-zinc-600">This section doesn&apos;t map to a health dimension.</span>
            )}
          </div>
        ) : (
          <p className="text-[9px] text-zinc-600">Select a section to see its contribution.</p>
        )}
      </div>
    </div>
  );
}
