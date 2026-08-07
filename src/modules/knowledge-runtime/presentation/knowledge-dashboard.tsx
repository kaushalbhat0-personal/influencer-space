"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { FeaturePage } from "@/features/_shared/components/feature-page";
import type { KnowledgeRuntimeResponse } from "@/actions/knowledge.actions";
import { KnowledgeScoreCard } from "./knowledge-score-card";
import { StorefrontScoreCard } from "./storefront-score-card";
import { CompletionQuestionnaire } from "./completion-questionnaire";
import { KNOWLEDGE_CATEGORY_LABELS } from "../domain/types";
import { getKnowledgeRuntime } from "@/actions/knowledge.actions";

interface Props {
  initial: KnowledgeRuntimeResponse;
  goalAlignment?: { label: string; percent: number } | null;
}

function groupByCategory(missing: KnowledgeRuntimeResponse["score"]["missingFields"]) {
  const groups = new Map<string, typeof missing>();
  for (const field of missing) {
    const key = KNOWLEDGE_CATEGORY_LABELS[field.category];
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(field);
  }
  return Array.from(groups.entries());
}

export function KnowledgeDashboard({ initial, goalAlignment }: Props) {
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

  const missingGroups = groupByCategory(runtime.score.missingFields);

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

          <div className="rounded-xl border border-white/10 bg-zinc-900/50 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">All missing fields</p>
              <span className="text-xs text-zinc-600">{runtime.completeness.complete}/{runtime.completeness.total} complete</span>
            </div>
            <div className="mt-4 space-y-4">
              {missingGroups.length === 0 ? (
                <p className="py-4 text-sm text-emerald-400">Nothing missing — your profile is complete.</p>
              ) : (
                missingGroups.map(([category, fields]) => (
                  <div key={category}>
                    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-600">{category}</p>
                    <div className="space-y-0.5">
                      {fields.map((field) => (
                        <Link
                          key={field.fieldId}
                          href={field.href}
                          className="group flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                        >
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${field.required ? "bg-amber-500" : "bg-zinc-700"}`} />
                          <span className="flex-1">{field.label}</span>
                          <span className="hidden text-[10px] text-zinc-600 sm:block">{field.hint}</span>
                          <span className="text-[10px] text-s8ul-cyan opacity-0 transition-opacity group-hover:opacity-100">open →</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
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
