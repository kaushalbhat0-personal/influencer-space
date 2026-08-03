"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGenerationExperience } from "@/features/onboarding/use-generation-experience";
import { GENERATION_STAGES, type RuntimeStageEvent } from "@/lib/generation/experience/stages";

/**
 * Developer visualization of the Generation Experience (IMPLEMENTATION-27).
 * Renders the runtime-driven stage model against a sequence of REAL
 * session-shaped events so the model can be inspected/verified in the browser.
 * This is a dev tool — not a product onboarding state.
 */
export default function DevGenerationExperiencePage() {
  const [events, setEvents] = useState<RuntimeStageEvent[]>([]);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    // Feed REAL events one stage at a time (simulates the workflow runtime
    // reporting progress — the same shape getGenerationSessionProgress returns).
    const timer = setInterval(() => {
      setTick((t) => {
        const next = Math.min(t + 1, GENERATION_STAGES.length);
        const newEvents: RuntimeStageEvent[] = GENERATION_STAGES.slice(0, next).map((s, i) => ({
          type: s.id,
          status: i === next - 1 && next < GENERATION_STAGES.length ? "running" : "completed",
        }));
        setEvents(newEvents);
        return next;
      });
    }, 700);
    return () => clearInterval(timer);
  }, []);

  const experience = useGenerationExperience({
    events,
    runtimeProgress: experienceProgress(events),
    elapsedMs: tick * 700,
    estimatedRemainingMs: null,
    hasStarted: events.length > 0,
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-lg space-y-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">Generation Experience (dev)</h1>
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--text-secondary,#A1A1AA)]">
            {experience.completedCount}/{experience.totalStages} stages
          </span>
          <span className="flex items-center gap-1.5 text-[var(--text-secondary,#A1A1AA)]">
            <Clock className="h-3.5 w-3.5" /> {experience.elapsedLabel}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full bg-[var(--surface-card-hover,#27272A)]"
          role="progressbar"
          aria-valuenow={experience.progress}
          aria-valuemin={0}
          aria-valuemax={100}
          data-testid="generation-progress"
        >
          <div className="h-full rounded-full bg-[var(--brand-primary,#6366F1)] transition-all duration-500" style={{ width: `${experience.progress}%` }} />
        </div>

        <div className="space-y-1">
          {experience.stages.map((stage) => {
            const isCurrent = experience.currentId === stage.id;
            const isCompleted = stage.status === "completed" || stage.status === "skipped";
            const isFailed = stage.status === "failed";
            return (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-3",
                  isCompleted && "text-[var(--text-secondary,#A1A1AA)]",
                  isCurrent && "bg-white/[0.03]",
                  isFailed && "bg-red-500/5",
                )}
                data-stage={stage.id}
                data-status={stage.status}
              >
                {isCompleted ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                ) : isFailed ? (
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
                ) : isCurrent ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[var(--brand-primary,#6366F1)]" />
                ) : (
                  <div className="h-4 w-4 shrink-0 rounded-full border border-[var(--border,rgba(255,255,255,0.08))]" />
                )}
                <span className="flex-1 text-sm">{stage.title}</span>
                {isCurrent && <span className="text-[10px] text-[var(--text-muted,#71717A)]">{stage.description}</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Runtime-derived progress from the real events (same rule as the server). */
function experienceProgress(events: RuntimeStageEvent[]): number {
  if (events.length === 0) return 0;
  const running = events.filter((e) => e.status === "running").length;
  const completed = events.filter((e) => e.status === "completed" || e.status === "skipped").length;
  const total = GENERATION_STAGES.length;
  return Math.round(((completed + running * 0.5) / total) * 100);
}
