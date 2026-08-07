"use client";

import type { StorefrontScore } from "../domain/types";

function barColor(percent: number): string {
  if (percent >= 80) return "bg-emerald-500";
  if (percent >= 60) return "bg-s8ul-cyan";
  if (percent >= 40) return "bg-amber-500";
  return "bg-rose-500";
}

function scoreColor(percent: number): string {
  if (percent >= 80) return "text-emerald-400";
  if (percent >= 60) return "text-s8ul-cyan";
  if (percent >= 40) return "text-amber-400";
  return "text-rose-400";
}

export function StorefrontScoreCard({
  storefrontScore,
  extra,
}: {
  storefrontScore: StorefrontScore;
  extra?: { label: string; percent: number } | null;
}) {
  const dimensions = [...storefrontScore.dimensions];
  if (extra) dimensions.push({ id: "goal-alignment" as StorefrontScore["dimensions"][number]["id"], label: extra.label, score: extra.percent });
  const overall = Math.round(dimensions.reduce((sum, d) => sum + d.score, 0) / dimensions.length);

  return (
    <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Storefront Quality</p>
        <span className={`text-2xl font-bold font-display ${scoreColor(overall)}`}>
          {overall}%
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-zinc-600">
        How your generated website performs across every dimension
      </p>

      <div className="mt-4 space-y-3">
        {dimensions.map((dimension) => (
          <div key={dimension.id}>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-400">{dimension.label}</span>
              <span className={`text-xs font-semibold ${scoreColor(dimension.score)}`}>{dimension.score}%</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full ${barColor(dimension.score)} transition-all duration-500`}
                style={{ width: `${dimension.score}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
