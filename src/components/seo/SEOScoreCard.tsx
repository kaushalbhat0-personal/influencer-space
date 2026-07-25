"use client";

import { DashboardWidget } from "@/components/ui/DashboardWidget";
import { scoreEngine } from "@/lib/seo";
import type { SEOScore } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Search, Shield, Palette, Hash, FileText } from "lucide-react";

interface SEOScoreCardProps {
  score: SEOScore;
  loading?: boolean;
  error?: string;
}

function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="transform -rotate-90">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="5" className="text-white/5" />
        <circle
          cx="36" cy="36" r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={cn(
            color === "emerald" && "text-emerald-400",
            color === "amber" && "text-amber-400",
            color === "red" && "text-red-400",
          )}
        />
      </svg>
      <span className={cn(
        "text-lg font-bold -mt-11",
        color === "emerald" && "text-emerald-400",
        color === "amber" && "text-amber-400",
        color === "red" && "text-red-400",
      )}>{value}</span>
      <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{label}</span>
    </div>
  );
}

const CATEGORIES = [
  { key: "metadata" as const, icon: FileText, label: "Metadata" },
  { key: "openGraph" as const, icon: Palette, label: "Open Graph" },
  { key: "twitter" as const, icon: Hash, label: "Twitter" },
  { key: "structuredData" as const, icon: Shield, label: "Schema" },
  { key: "technical" as const, icon: Search, label: "Technical" },
];

export function SEOScoreCard({ score, loading, error }: SEOScoreCardProps) {
  const overallLabel = scoreEngine.getScoreLabel(score.overall);

  return (
    <DashboardWidget title="SEO Score" icon={Search} loading={loading} error={error}>
      <div className="flex flex-col items-center pt-2 pb-4">
        <ScoreRing value={score.overall} label={overallLabel.label} color={overallLabel.color} />
      </div>
      <div className="grid grid-cols-5 gap-2">
        {CATEGORIES.map(({ key, icon: Icon, label }) => {
          const catScore = score[key];
          const catLabel = scoreEngine.getScoreLabel(catScore);
          return (
            <div key={key} className="flex flex-col items-center gap-1 rounded-lg bg-white/5 p-2">
              <Icon className="h-3.5 w-3.5 text-zinc-400" />
              <span className={cn(
                "text-sm font-semibold",
                catLabel.color === "emerald" && "text-emerald-400",
                catLabel.color === "amber" && "text-amber-400",
                catLabel.color === "red" && "text-red-400",
              )}>{catScore}</span>
              <span className="text-[10px] text-zinc-500">{label}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-4 space-y-2">
        {score.checks.filter((c) => !c.passed).slice(0, 3).map((check) => (
          <div key={check.id} className="flex items-start gap-2 text-xs">
            <span className={cn(
              "mt-0.5 h-1.5 w-1.5 flex-shrink-0 rounded-full",
              check.severity === "error" && "bg-red-400",
              check.severity === "warning" && "bg-amber-400",
              check.severity === "info" && "bg-zinc-500",
            )} />
            <div>
              <p className="text-zinc-300">{check.recommendation}</p>
              {check.cta && (
                <a href={check.cta.href} className="text-s8ul-cyan hover:underline">{check.cta.label}</a>
              )}
            </div>
          </div>
        ))}
      </div>
    </DashboardWidget>
  );
}
