"use client";

import { useEffect, useState } from "react";
import { Gauge, Loader2, Sparkles, Target } from "lucide-react";
import { builderStore } from "@/lib/builder/store";
import { builderEvents } from "@/lib/builder/events";
import { getExperienceIntelligence } from "@/actions/experience-intelligence.actions";

interface ExperienceData {
  conversionScore: { overall: number; dimensions: Array<{ id: string; label: string; score: number }> };
  businessHealth: { overall: number; grade: string } | null;
  goalAlignment: { overall: number } | null;
  cta: { primary: string; secondary: string | null };
  hiddenBases: string[];
  sectionPlan: Record<string, { base: string; label: string; visible: boolean; conversionWeight: number; trustWeight: number; commerceWeight: number; seoWeight: number }>;
}

function selectedSectionBase(): string | null {
  const ids = builderStore.getSelectedIds();
  if (ids.length === 0) return null;
  const pageId = builderStore.canvas.activePageId;
  if (!pageId) return null;
  const section = builderStore.getSection(pageId, ids[0] as never);
  const moduleId = section?.slots?.[0]?.moduleId;
  return moduleId ? String(moduleId).split(".")[0] : null;
}

function WeightBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-16 text-[9px] text-zinc-500">{label}</span>
      <div className="flex-1 h-1 rounded-full bg-zinc-800">
        <div className="h-full rounded-full bg-s8ul-cyan/70" style={{ width: `${value * 100}%` }} />
      </div>
    </div>
  );
}

export function BuilderExperiencePanel() {
  const [data, setData] = useState<ExperienceData | null>(null);
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
    getExperienceIntelligence().then((result) => {
      if (!cancelled && result.success && result.data) setData(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const section = selectedBase ? data?.sectionPlan[selectedBase] : null;

  return (
    <div className="rounded-lg border border-white/5 bg-zinc-900/50">
      <div className="flex items-center gap-1.5 border-b border-white/5 px-2.5 py-1.5">
        <Gauge className="h-3 w-3 text-s8ul-cyan" />
        <p className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">Experience Intelligence</p>
      </div>

      <div className="space-y-2 p-2">
        {data === null && (
          <div className="flex items-center justify-center gap-2 py-3 text-[10px] text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Analyzing…
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-3 gap-1.5">
              <div className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Conversion</p>
                <p className="text-sm font-bold text-s8ul-cyan">{data.conversionScore.overall}%</p>
              </div>
              <div className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Health</p>
                <p className="text-sm font-bold text-emerald-400">{data.businessHealth ? `${data.businessHealth.overall}%` : "—"}</p>
              </div>
              <div className="rounded-md border border-white/5 bg-white/[0.02] px-2 py-1.5">
                <p className="text-[8px] uppercase tracking-wider text-zinc-500">Goals</p>
                <p className="text-sm font-bold text-amber-300">{data.goalAlignment ? `${data.goalAlignment.overall}%` : "—"}</p>
              </div>
            </div>

            {selectedBase && section ? (
              <div className="rounded-md border border-white/5 bg-white/[0.02] p-2">
                <p className="mb-1.5 flex items-center gap-1 text-[9px] font-medium text-zinc-400">
                  <Sparkles className="h-3 w-3 text-s8ul-cyan" />
                  {section.label} contribution
                  {!section.visible && <span className="rounded bg-amber-500/10 px-1 text-[8px] text-amber-400">hidden</span>}
                </p>
                <div className="space-y-1">
                  <WeightBar label="Conversion" value={section.conversionWeight} />
                  <WeightBar label="Trust" value={section.trustWeight} />
                  <WeightBar label="Commerce" value={section.commerceWeight} />
                  <WeightBar label="SEO" value={section.seoWeight} />
                </div>
              </div>
            ) : (
              <p className="px-1 py-1 text-[9px] text-zinc-600">Select a section to see its conversion impact.</p>
            )}

            <div className="flex items-center gap-1 text-[9px] text-zinc-500">
              <Target className="h-3 w-3 text-amber-400" />
              <span>Recommended CTA: <b className="text-zinc-300">{data.cta.primary}</b></span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
