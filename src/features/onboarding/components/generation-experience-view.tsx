"use client";

/**
 * Presentational Generation Experience view — IMPLEMENTATION-28.
 *
 * Pure consumer of the runtime-driven generation model. It renders the
 * useGenerationExperience output through the Generation Animation Runtime
 * primitives. It owns NO state, NO progress, NO timing — it only visualizes.
 */
import { CheckCircle2, AlertTriangle, Clock } from "lucide-react";
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
        <h1 className="text-xl font-semibold text-white">Building your storefront</h1>
        <p className="mt-1 text-sm text-zinc-400">
          AI is analyzing your profile, generating content, and setting up your workspace.
        </p>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-zinc-400" aria-hidden="true">
          {percent}% complete
        </span>
        <span className="flex items-center gap-1.5 text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          <Crossfade value={experience.elapsedLabel}>{experience.elapsedLabel}</Crossfade>
          {experience.remainingLabel && (
            <Crossfade value={experience.remainingLabel}>
              <span className="text-zinc-600">· {experience.remainingLabel}</span>
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
                s.isCompleted && "text-zinc-300",
                s.isCurrent && "bg-white/[0.03]",
                s.isFailed && "bg-red-500/5",
              )}
            >
              {s.isCompleted ? (
                <SuccessIcon>
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                </SuccessIcon>
              ) : s.isFailed ? (
                <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
              ) : s.isCurrent ? (
                <GlowIndicator className="shrink-0" />
              ) : (
                <div className="h-4 w-4 shrink-0 rounded-full border border-zinc-700" />
              )}
              <span className="text-sm flex-1">
                {stage.title}
                {s.isCurrent && (
                  <Crossfade value={stage.description}>
                    <span className="ml-2 text-[10px] text-zinc-500">{stage.description}</span>
                  </Crossfade>
                )}
              </span>
              {s.isFailed && stage.error && (
                <span className="max-w-[160px] truncate text-right text-[10px] text-red-400" title={stage.error}>
                  {stage.error}
                </span>
              )}
            </FadeIn>
          );
        })}
      </div>

      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-zinc-600">
        <span>Powered by CreatorStore AI</span>
        <span>
          {completed}/{experience.totalStages} stages
        </span>
      </div>

      {experience.hasFailure && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
          <p className="text-sm font-medium text-red-400">Some steps had issues</p>
          <p className="mt-1 text-xs text-zinc-400">
            We&apos;ll proceed with what we have. You can fix things later in the builder.
          </p>
        </div>
      )}
    </div>
  );
}
