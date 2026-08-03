"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGenerationExperience } from "@/features/onboarding/use-generation-experience";
import { GenerationExperienceView } from "@/features/onboarding/components/generation-experience-view";
import { ConstructionPreview } from "@/features/onboarding/components/construction-preview";
import { useConstructionSnapshot } from "@/features/onboarding/hooks/use-construction-snapshot";
import { GENERATION_STAGES, type RuntimeStageEvent } from "@/lib/generation/experience/stages";

/**
 * Developer visualization of the Generation Experience + Animation Runtime +
 * Storefront Construction (IMPLEMENTATION-27/28/29). Renders the runtime-driven
 * stage model and the live construction preview against REAL session-shaped
 * events, so the whole chain can be verified in the browser. This is a dev tool
 * — not a product state. Dev-only knobs: ?failStage=<id>, ?speed=ms, ?pace=ms
 * (pace holds each stage in "running" for ms before the next advances).
 */
const SEEDED_SUBDOMAIN = "test-creator-1";

export default function DevGenerationExperiencePage() {
  return (
    <Suspense fallback={null}>
      <DevGenerationExperienceInner />
    </Suspense>
  );
}

function DevGenerationExperienceInner() {
  const searchParams = useSearchParams();
  const failStage = searchParams.get("failStage") ?? null;
  const speed = Number(searchParams.get("speed")) || 700;
  const pace = Number(searchParams.get("pace")) || 0;

  const [events, setEvents] = useState<RuntimeStageEvent[]>([]);
  const [tick, setTick] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const holdUntilRef = useRef(0);
  const startRef = useRef(Date.now());

  useEffect(() => {
    // Feed REAL events one stage at a time (simulates the workflow runtime
    // reporting progress — the same shape getGenerationSessionProgress returns).
    // When pace>0, the running stage is held for `pace` ms so intermediate
    // states stay observable in the browser for verification.
    const timer = setInterval(() => {
      if (Date.now() < holdUntilRef.current) return;
      setElapsedMs(Date.now() - startRef.current);
      setTick((t) => {
        const next = Math.min(t + 1, GENERATION_STAGES.length);
        const newEvents: RuntimeStageEvent[] = GENERATION_STAGES.slice(0, next).map((s, i) => {
          if (i === next - 1 && next < GENERATION_STAGES.length) {
            return { type: s.id, status: failStage === s.id ? "failed" : "running" };
          }
          return { type: s.id, status: "completed" };
        });
        setEvents(newEvents);
        if (pace > 0 && next < GENERATION_STAGES.length) {
          holdUntilRef.current = Date.now() + pace;
        }
        return next;
      });
    }, speed);
    return () => clearInterval(timer);
  }, [failStage, speed, pace]);

  const experience = useGenerationExperience({
    events,
    runtimeProgress: experienceProgress(events),
    elapsedMs,
    estimatedRemainingMs: null,
    hasStarted: events.length > 0,
  });

  const { snapshot } = useConstructionSnapshot({
    subdomain: SEEDED_SUBDOMAIN,
    refreshKey: experience.currentId,
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">
            Generation Experience + Animation + Construction (dev)
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">
            subdomain: {SEEDED_SUBDOMAIN} · failStage: {failStage ?? "none"} · speed: {speed}ms
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div>
            <GenerationExperienceView experience={experience} />
          </div>
          <ConstructionPreview
            experience={experience}
            snapshot={snapshot}
            subdomain={SEEDED_SUBDOMAIN}
          />
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
