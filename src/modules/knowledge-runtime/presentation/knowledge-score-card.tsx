"use client";

import Link from "next/link";
import { ArrowUpRight, CheckCircle2 } from "lucide-react";
import type { CategoryScore, KnowledgeScore } from "../domain/types";
import { confidenceLabel, scoreLabel } from "../application/score-engine";

function scoreColor(percent: number): string {
  if (percent >= 80) return "text-emerald-400";
  if (percent >= 60) return "text-s8ul-cyan";
  if (percent >= 40) return "text-amber-400";
  return "text-rose-400";
}

function barColor(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 60) return "bg-s8ul-cyan";
  if (percent >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

export function KnowledgeScoreCard({
  overall,
  confidence,
  categories,
  missing,
  compact = false,
}: {
  overall: number;
  confidence: number;
  categories: CategoryScore[];
  missing: KnowledgeScore["missingFields"];
  compact?: boolean;
}) {
  const confidenceText = confidenceLabel(confidence);
  const grade = scoreLabel(overall);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Knowledge Score</span>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${scoreColor(overall)}/10 ${scoreColor(overall)}`}>
              {grade}
            </span>
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            How much we know about your business profile
          </p>
        </div>
        <div className="flex items-end gap-3">
          <span className={`text-4xl font-bold font-display ${scoreColor(overall)}`}>{overall}%</span>
          <span className="pb-1 text-[10px] uppercase tracking-wider text-zinc-600">confidence: {confidenceText}</span>
        </div>
      </div>

      <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full ${barColor(overall)} transition-all duration-500`}
          style={{ width: `${overall}%` }}
          role="progressbar"
          aria-valuenow={overall}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${overall}% complete`}
        />
      </div>

      {!compact && (
        <div className="mt-5 grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-5">
          {categories.map((category) => (
            <div key={category.id}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500">{category.label}</span>
                <span className={`text-[11px] font-semibold ${scoreColor(category.percent)}`}>
                  {category.percent}%
                </span>
              </div>
              <div className="mt-1 h-1 overflow-hidden rounded-full bg-zinc-800">
                <div className={`h-full rounded-full ${barColor(category.percent)}`} style={{ width: `${category.percent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {missing.length > 0 ? (
        <div className="mt-5 border-t border-white/5 pt-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">
            Missing ({missing.length})
          </p>
          <div className="space-y-1">
            {missing.slice(0, compact ? 3 : 6).map((field) => (
              <Link
                key={field.fieldId}
                href={field.href}
                className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${field.required ? "bg-amber-500" : "bg-zinc-700"}`} />
                <span className="flex-1 truncate">{field.label}</span>
                <span className="text-[10px] text-zinc-600 opacity-0 transition-opacity group-hover:opacity-100">
                  {field.href}
                </span>
                <ArrowUpRight className="h-3 w-3 text-zinc-600 group-hover:text-s8ul-cyan" />
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-5 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-400">
          <CheckCircle2 className="h-4 w-4" />
          Complete — your profile is premium-ready.
        </div>
      )}
    </div>
  );
}
