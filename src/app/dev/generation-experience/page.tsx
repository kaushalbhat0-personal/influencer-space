"use client";

import { useEffect, useState } from "react";
import { useGenerationExperience } from "@/features/onboarding/use-generation-experience";
import { GenerationExperienceView } from "@/features/onboarding/components/generation-experience-view";
import { GENERATION_STAGES, type RuntimeStageEvent } from "@/lib/generation/experience/stages";

/**
 * Developer visualization of the Generation Experience + Animation Runtime
 * (IMPLEMENTATION-27/28). Renders the runtime-driven stage model against a
 * sequence of REAL session-shaped events so the animation layer can be
 * inspected/verified in the browser. This is a dev tool — not a product state.
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
        <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">Generation Experience + Animation Runtime (dev)</h1>
        <GenerationExperienceView experience={experience} />
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
