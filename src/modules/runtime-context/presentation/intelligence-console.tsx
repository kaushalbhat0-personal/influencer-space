"use client";

import { Brain, Target, Trophy, Sparkles, Store } from "lucide-react";

export interface TenantIntelligenceView {
  knowledge: { overall: number; confidence: number } | null;
  storefront: { overall: number } | null;
  goalAlignment: { overall: number } | null;
  success: { completionPercent: number } | null;
  recommendations: { active: number; top: string | null } | null;
}

export function IntelligenceConsole({ intelligence }: { intelligence: TenantIntelligenceView }) {
  const items = [
    {
      label: "Knowledge",
      value: intelligence.knowledge ? `${intelligence.knowledge.overall}%` : "—",
      icon: <Brain className="h-4 w-4 text-s8ul-cyan" />,
    },
    {
      label: "Storefront",
      value: intelligence.storefront ? `${intelligence.storefront.overall}%` : "—",
      icon: <Store className="h-4 w-4 text-emerald-400" />,
    },
    {
      label: "Goal Alignment",
      value: intelligence.goalAlignment ? `${intelligence.goalAlignment.overall}%` : "—",
      icon: <Target className="h-4 w-4 text-amber-400" />,
    },
    {
      label: "Success Progress",
      value: intelligence.success ? `${intelligence.success.completionPercent}%` : "—",
      icon: <Trophy className="h-4 w-4 text-purple-400" />,
    },
    {
      label: "Active Recommendations",
      value: intelligence.recommendations ? String(intelligence.recommendations.active) : "—",
      icon: <Sparkles className="h-4 w-4 text-fuchsia-400" />,
    },
  ];

  return (
    <div className="mb-6 rounded-xl border border-white/10 bg-zinc-900/50 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
        Platform Intelligence (Runtime Context)
      </p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {items.map((item) => (
          <div key={item.label} className="rounded-lg border border-white/5 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5">{item.icon}<span className="text-[10px] text-zinc-500">{item.label}</span></div>
            <p className="mt-1 text-lg font-bold text-white">{item.value}</p>
          </div>
        ))}
      </div>
      {intelligence.recommendations?.top && (
        <p className="mt-2 text-[10px] text-zinc-600">Top recommendation: {intelligence.recommendations.top}</p>
      )}
    </div>
  );
}
