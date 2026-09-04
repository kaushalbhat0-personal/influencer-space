"use client";

/**
 * Presentational Generation Experience view — IMPLEMENTATION-28.
 *
 * Pure consumer of the runtime-driven generation model. It renders the
 * useGenerationExperience output through the Generation Animation Runtime
 * primitives. It owns NO state, NO progress, NO timing — it only visualizes.
 */
import { CheckCircle2, AlertTriangle, Clock, Activity as ActivityIcon, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  FadeIn,
  SuccessIcon,
  GlowIndicator,
  Crossfade,
  ProgressBar,
  useAnimatedNumber,
} from "@/lib/generation/animation/primitives";
import { useGenerationAnimation } from "@/lib/generation/animation/runtime";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";

export function GenerationExperienceView({ experience }: { experience: GenerationExperience }) {
  const anim = useGenerationAnimation(experience);
  const percent = useAnimatedNumber(experience.progress);
  const completed = useAnimatedNumber(experience.completedCount);

  return (
    <div className="space-y-6" role="status" aria-live="polite">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">Building your storefront</h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          AI is analyzing your profile, generating content, and setting up your workspace.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]" aria-hidden="true">
          {percent}% complete
        </span>
        <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <Clock className="h-3.5 w-3.5" />
          <Crossfade value={experience.elapsedLabel}>{experience.elapsedLabel}</Crossfade>
          {experience.remainingLabel && (
            <Crossfade value={experience.remainingLabel}>
              <span className="text-[var(--text-muted)]">· {experience.remainingLabel}</span>
            </Crossfade>
          )}
        </span>
      </div>

      <ProgressBar value={experience.progress} testId="generation-progress" ariaLabel="Storefront generation progress" />

      <p className="sr-only">
        {experience.current ? `Now: ${experience.current.title}` : "Preparing workspace"}
      </p>

      <div className="space-y-1">
        {anim.stages.map((s) => {
          const stage = experience.stages.find((x) => x.id === s.key) ?? null;
          if (!stage) return null;
          return (
            <FadeIn
              key={s.key}
              dataStage={s.key}
              dataStatus={s.status}
              className={cn(
                "flex items-center gap-3 rounded-lg px-4 py-3",
                s.isCompleted && "text-[var(--text-primary)]",
                s.isCurrent && "bg-[var(--surface-card)]",
                s.isFailed && "bg-red-500/5",
              )}
            >
              {s.isCompleted ? (
                <SuccessIcon>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
                </SuccessIcon>
              ) : s.isFailed ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-danger)]" />
              ) : s.isCurrent ? (
                <GlowIndicator className="shrink-0" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-700" />
              )}
              <span className="text-sm flex-1">
                {stage.title}
                {s.isCurrent && (
                  <Crossfade value={stage.description}>
                    <span className="ml-2 text-[10px] text-[var(--text-muted)]">{stage.description}</span>
                  </Crossfade>
                )}
              </span>
              {s.isFailed && stage.error && (
                <span className="max-w-[160px] truncate text-right text-[10px] text-[var(--color-danger)]" title={stage.error}>
                  {stage.error}
                </span>
              )}
            </FadeIn>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        <span>Powered by CreatorStore AI</span>
        <span>
          {completed}/{experience.totalStages} stages
        </span>
      </div>

      {/* RCCF-LAUNCH-TRACK-03: live micro-activity feed — real pipeline milestones. */}
      {experience.activity && experience.activity.length > 0 && (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <p className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-widest text-[var(--text-muted)]">
            <ActivityIcon className="h-3 w-3" /> What&apos;s happening
          </p>
          <ul className="mt-2 space-y-1.5">
            {experience.activity.slice(-8).map((item, i) => (
              <li key={`${item}-${i}`} className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
                <span className="mt-0.5 text-[var(--color-success)] flex-shrink-0"><CheckCircle2 className="h-3.5 w-3.5" /></span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {experience.hasFailure && (
        <div className="rounded-lg border border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] p-4">
          <p className="text-sm font-medium text-[var(--color-danger)]">Some steps had issues</p>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            We&apos;ll proceed with what we have. You can fix things later in the builder.
          </p>
        </div>
      )}

      {/* RCCF-LAUNCH-TRACK-03: completion — a brief success message before the
          dashboard opens (register success, then navigate). */}
      {experience.isComplete && (
        <div className="rounded-xl border border-emerald-500/20 bg-[var(--color-success)]/5 p-4 text-center">
          <SuccessIcon>
            <Sparkles className="mx-auto h-6 w-6 text-[var(--color-success)]" />
          </SuccessIcon>
          <p className="mt-1 text-sm font-semibold text-[var(--text-primary)]">Your website is ready!</p>
          <p className="text-xs text-[var(--text-secondary)]">Opening your dashboard…</p>
        </div>
      )}
    </div>
  );
}
