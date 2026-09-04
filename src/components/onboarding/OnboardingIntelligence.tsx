"use client";

import { Sparkles, Target, Check, Clock } from "lucide-react";
import type { OnboardingPreview } from "@/modules/runtime-context";

interface Props {
  preview: OnboardingPreview;
  useGoals: boolean;
  onToggleGoals: (value: boolean) => void;
  questionAnswers: Record<string, unknown>;
  onAnswer: (fieldId: string, value: unknown) => void;
}

export function OnboardingIntelligence({ preview, useGoals, onToggleGoals, questionAnswers, onAnswer }: Props) {
  const { knowledgeScore, goalProfile, topRecommendations, questions } = preview;

  const answerable = questions.filter((q) => q.type === "text" || q.type === "choice" || q.type === "textarea").slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Knowledge Score */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Profile Knowledge</p>
          <span className="text-xl font-bold text-[var(--brand-primary)]">{knowledgeScore.overall}%</span>
        </div>
        <div className="mt-2 h-1.5 rounded-full bg-zinc-800">
          <div className="h-full rounded-full bg-gradient-to-r from-[var(--brand-primary)] to-emerald-400" style={{ width: `${knowledgeScore.overall}%` }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {knowledgeScore.categories.slice(0, 3).map((category) => (
            <div key={category.id}>
              <p className="text-[10px] text-[var(--text-muted)]">{category.label}</p>
              <p className="text-xs font-medium text-[var(--text-primary)]">{category.percent}%</p>
            </div>
          ))}
        </div>
        {knowledgeScore.missingFields.length > 0 && (
          <p className="mt-2 text-[10px] text-[var(--text-muted)]">
            We&apos;ll help you complete: {knowledgeScore.missingFields.slice(0, 3).map((m) => m.label).join(", ")}
          </p>
        )}
      </div>

      {/* Recommended goals */}
      <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
        <div className="flex items-center justify-between">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Target className="h-3.5 w-3.5 text-[var(--brand-primary)]" /> Recommended goals
          </p>
          <label className="flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={useGoals}
              onChange={(e) => onToggleGoals(e.target.checked)}
              className="accent-[#00e5ff]"
            />
            Use these goals
          </label>
        </div>
        <div className="mt-3 space-y-2">
          {goalProfile.weights.map((weight) => (
            <div key={weight.goalId}>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[var(--text-primary)]">{weight.goalId.replace(/_/g, " ")}</span>
                <span className="text-[var(--brand-primary)] font-semibold">{weight.weight}%</span>
              </div>
              <div className="mt-1 h-1 rounded-full bg-zinc-800">
                <div className="h-full rounded-full bg-[var(--brand-primary)]/70" style={{ width: `${weight.weight}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Top recommendations */}
      {topRecommendations.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Recommended first steps
          </p>
          <div className="mt-3 space-y-2">
            {topRecommendations.map((rec) => (
              <div key={rec.id} className="flex items-start gap-2 rounded-lg border border-white/5 bg-zinc-900/40 px-3 py-2">
                <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[var(--text-primary)]">{rec.title}</p>
                  <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">{rec.description}</p>
                </div>
                <span className="flex items-center gap-1 shrink-0 text-[10px] text-[var(--text-muted)]">
                  <Clock className="h-3 w-3" /> {rec.estimatedTime}m
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Adaptive questions */}
      {answerable.length > 0 && (
        <div className="rounded-xl bg-white/[0.03] border border-white/5 p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">Quick answers (optional)</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-muted)]">Answer these and we&apos;ll include them in your generated profile.</p>
          <div className="mt-3 space-y-3">
            {answerable.map((question) => (
              <div key={question.id}>
                <p className="mb-1 text-xs text-[var(--text-primary)]">{question.prompt}</p>
                {question.type === "choice" ? (
                  <div className="flex flex-wrap gap-1.5">
                    {question.options?.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onAnswer(question.fieldId, option.value)}
                        className={`rounded-lg border px-2.5 py-1 text-[11px] transition-colors ${
                          questionAnswers[question.fieldId] === option.value
                            ? "border-[var(--brand-primary)] bg-[var(--brand-primary)]/10 text-[var(--brand-primary)]"
                            : "border-white/10 text-[var(--text-secondary)] hover:border-white/25"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                ) : (
                  <input
                    type="text"
                    placeholder={question.placeholder}
                    value={(questionAnswers[question.fieldId] as string) ?? ""}
                    onChange={(e) => onAnswer(question.fieldId, e.target.value)}
                    className="admin-input w-full text-xs"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
