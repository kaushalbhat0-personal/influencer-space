"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import type { KnowledgeRuntimeResponse } from "@/actions/knowledge.actions";
import { KnowledgeScoreCard } from "./knowledge-score-card";
import { StorefrontScoreCard } from "./storefront-score-card";
import { CompletionQuestionnaire } from "./completion-questionnaire";
import { RecommendedImprovements } from "@/modules/recommendation-runtime/presentation/recommended-improvements";
import type { Recommendation } from "@/modules/recommendation-runtime";
import { getKnowledgeRuntime } from "@/actions/knowledge.actions";

interface Props {
  initial: KnowledgeRuntimeResponse;
  goalAlignment?: { label: string; percent: number } | null;
  recommendations?: Recommendation[];
}

export function KnowledgeDashboard({ initial, goalAlignment, recommendations }: Props) {
  const [runtime, setRuntime] = useState<KnowledgeRuntimeResponse>(initial);
  const [reloading, setReloading] = useState(false);

  const refresh = useCallback(async () => {
    setReloading(true);
    try {
      const result = await getKnowledgeRuntime();
      if (result.success && result.data) setRuntime(result.data);
    } finally {
      setReloading(false);
    }
  }, []);

  return (
    <FeaturePage
      title="Knowledge"
      description={`Measure your profile completeness and finish only what's missing. Pack: ${runtime.pack.name}.`}
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <KnowledgeScoreCard
            overall={runtime.score.overall}
            confidence={runtime.score.confidence}
            categories={runtime.score.categories}
            missing={runtime.score.missingFields}
          />

          <CompletionQuestionnaire questions={runtime.questions} onSaved={refresh} />

          {recommendations && <RecommendedImprovements initial={recommendations} />}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <StorefrontScoreCard storefrontScore={runtime.storefrontScore} extra={goalAlignment} />

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Builder hints</p>
            <p className="mt-1 text-[11px] text-zinc-600">Also visible inside the Layout Builder.</p>
            <div className="mt-3 space-y-2">
              {runtime.hints.map((hint) => (
                <Link
                  key={hint.id}
                  href={hint.href}
                  className={`block rounded-lg border px-3 py-2 text-xs transition-colors ${
                    hint.severity === "critical"
                      ? "border-rose-500/20 bg-rose-500/5 text-rose-300 hover:border-rose-500/40"
                      : hint.severity === "warning"
                        ? "border-amber-500/20 bg-amber-500/5 text-amber-300 hover:border-amber-500/40"
                        : "border-white/10 text-zinc-400 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <span className="block font-medium">{hint.title}</span>
                  <span className="mt-0.5 block text-[11px] opacity-80">{hint.message}</span>
                </Link>
              ))}
              {runtime.hints.length === 0 && (
                <p className="text-xs text-zinc-500">No builder hints — all sections have strong content.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Knowledge integrity</p>
            <p className="mt-1 text-[11px] text-zinc-600">
              This runtime measures your profile from real data. AI never invents
              products, achievements, testimonials or pricing — those always come from you.
            </p>
          </div>

          {reloading && <p className="text-xs text-zinc-500">Refreshing…</p>}
        </div>
      </div>
    </FeaturePage>
  );
}
