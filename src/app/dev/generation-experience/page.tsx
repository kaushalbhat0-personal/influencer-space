"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useGenerationExperience } from "@/features/onboarding/use-generation-experience";
import { GenerationExperienceView } from "@/features/onboarding/components/generation-experience-view";
import { ConstructionPreview } from "@/features/onboarding/components/construction-preview";
import { ActivityFeedView } from "@/features/onboarding/components/activity-feed";
import { useConstructionSnapshot } from "@/features/onboarding/hooks/use-construction-snapshot";
import { importCreatorProfile } from "@/actions/onboarding.actions";
import { GENERATION_STAGES, type RuntimeStageEvent } from "@/lib/generation/experience/stages";

/**
 * Developer visualization of the Generation Experience + Animation Runtime +
 * Storefront Construction + Profile Acquisition (IMPLEMENTATION-27…31). Renders
 * the runtime-driven stage model, live construction preview and activity feed
 * against REAL session-shaped events, plus an acquisition probe. This is a dev
 * tool — not a product state. Dev-only knobs: ?failStage=<id>, ?speed=ms,
 * ?pace=ms, ?profileUrl=<any platform URL> (acquisition probe).
 */
const SEEDED_SUBDOMAIN = "test-creator-1";

export default function DevGenerationExperiencePage() {
  return (
    <Suspense fallback={null}>
      <DevGenerationExperienceInner />
    </Suspense>
  );
}

/** Dev-only acquisition probe — surfaces Unified Profile Acquisition diagnostics. */
function AcquisitionProbe({ initialUrl }: { initialUrl: string }) {
  const [url, setUrl] = useState(initialUrl);
  const [result, setResult] = useState<{
    platform?: string;
    persona?: { name: string };
    confidence?: number;
    acquisition?: {
      platform: string;
      adapter: string;
      capabilities: string[];
      populatedFields: string[];
      missingFields: string[];
      warnings: string[];
    };
    identity?: {
      entityType: string | null;
      primaryNiche: string | null;
      persona: string | null;
      confidence: number;
      aiUsed: boolean;
      provider: string | null;
      model: string | null;
      cacheHit: boolean;
      cost: number;
      promptVersion: string;
      notes: string[];
    };
    intelligence?: {
      entities: Array<{ entity: string; confidence: number }>;
      niches: Array<{ niche: string; confidence: number }>;
      businessModels: Array<{ model: string; confidence: number }>;
      audience: Array<{ segment: string; confidence: number }>;
      recommendations: { theme: string | null; sections: string[]; cta: string | null };
      confidence: number;
      evidenceCount: number;
    };
    error?: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void importCreatorProfile(url)
      .then((res) => {
        if (!cancelled) setResult(res);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [url]);

  return (
    <div className="rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)] p-4" data-testid="acquisition-probe">
      <p className="text-xs font-medium text-[var(--text-primary,#FAFAFA)]">Profile Acquisition Probe</p>
      <div className="mt-2 flex gap-2">
        <input
          className="h-8 flex-1 rounded-md bg-[var(--surface-root,#09090B)] px-2 text-xs text-[var(--text-primary,#FAFAFA)] outline-none"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          aria-label="Profile URL"
        />
      </div>
      <div className="mt-2 space-y-1 text-[11px]" data-testid="acquisition-result">
        {result?.error && <p className="text-red-400">error: {result.error}</p>}
        {result?.acquisition && (
          <>
            <p data-testid="acquisition-line">
              platform: <span data-testid="acq-platform">{result.acquisition.platform}</span> · adapter:{" "}
              <span data-testid="acq-adapter">{result.acquisition.adapter}</span> · persona:{" "}
              <span data-testid="acq-persona">{result.persona?.name ?? "unknown"}</span> · confidence:{" "}
              <span data-testid="acq-confidence">{result.confidence ?? 0}</span>
            </p>
            <p data-testid="acq-populated" className="text-[var(--text-secondary,#A1A1AA)]">
              data: {result.acquisition.populatedFields.join(", ") || "—"}
            </p>
            <p data-testid="acq-missing" className="text-[var(--text-muted,#71717A)]">
              missing: {result.acquisition.missingFields.join(", ") || "—"}
            </p>
            {result.acquisition.warnings.length > 0 && (
              <p className="text-amber-400" data-testid="acq-warnings">
                warnings: {result.acquisition.warnings.join("; ")}
              </p>
            )}
          </>
        )}
        {result?.identity && (
          <p className="mt-1 text-[var(--text-secondary,#A1A1AA)]" data-testid="identity-line">
            identity: <span data-testid="id-entity">{result.identity.entityType ?? "—"}</span> · niche:{" "}
            <span data-testid="id-niche">{result.identity.primaryNiche ?? "—"}</span> · persona:{" "}
            <span data-testid="id-persona">{result.identity.persona ?? "—"}</span> · confidence:{" "}
            <span data-testid="id-confidence">{result.identity.confidence.toFixed(2)}</span> · ai:{" "}
            <span data-testid="id-ai">{result.identity.aiUsed ? "used" : "skipped"}</span>
            {result.identity.aiUsed && (
              <>
                {" "}· provider: <span data-testid="id-provider">{result.identity.provider ?? "—"}</span>
                {" "}· cache: <span data-testid="id-cache">{result.identity.cacheHit ? "hit" : "miss"}</span>
              </>
            )}
          </p>
        )}
        {result?.identity && result.identity.notes.length > 0 && (
          <p className="mt-0.5 text-[10px] text-[var(--text-muted,#71717A)]" data-testid="id-notes">
            {result.identity.notes.join(" · ")}
          </p>
        )}
        {result?.intelligence && (
          <div className="mt-2 space-y-1 text-[11px] text-[var(--text-secondary,#A1A1AA)]" data-testid="intelligence-line">
            <p>
              entities: <span data-testid="int-entities">{result.intelligence.entities.map((e) => `${e.entity}(${e.confidence})`).join(", ") || "—"}</span> · niches:{" "}
              <span data-testid="int-niches">{result.intelligence.niches.map((n) => `${n.niche}(${n.confidence})`).join(", ") || "—"}</span>
            </p>
            <p>
              business: <span data-testid="int-business">{result.intelligence.businessModels.map((b) => `${b.model}(${b.confidence})`).join(", ") || "—"}</span> · audience:{" "}
              <span data-testid="int-audience">{result.intelligence.audience.map((a) => a.segment).join(", ") || "—"}</span>
            </p>
            <p>
              recommendations: <span data-testid="int-recs">{result.intelligence.recommendations.theme ?? "—"} · {result.intelligence.recommendations.sections.join(", ")} · {result.intelligence.recommendations.cta ?? "—"}</span> · confidence:{" "}
              <span data-testid="int-confidence">{result.intelligence.confidence}</span> · evidence: <span data-testid="int-evidence">{result.intelligence.evidenceCount}</span>
            </p>
          </div>
        )}
      </div>
    </div>
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
        // Real per-stage duration: how long each stage actually ran for (the
        // hold time), so timestamps derive honestly from the runtime shape.
        const stageDuration = pace > 0 ? pace : speed;
        const newEvents: RuntimeStageEvent[] = GENERATION_STAGES.slice(0, next).map((s, i) => {
          if (i === next - 1 && next < GENERATION_STAGES.length) {
            return { type: s.id, status: failStage === s.id ? "failed" : "running" };
          }
          return { type: s.id, status: "completed", duration: stageDuration };
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

  const profileUrl = searchParams.get("profileUrl") ?? "https://instagram.com/cristiano";

  const { snapshot } = useConstructionSnapshot({
    subdomain: SEEDED_SUBDOMAIN,
    refreshKey: experience.currentId,
  });

  return (
    <div className="min-h-screen bg-[var(--surface-root)] p-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[var(--text-primary,#FAFAFA)]">
            Generation Experience + Animation + Construction + Activity + Acquisition (dev)
          </h1>
          <span className="text-[10px] uppercase tracking-wide text-[var(--text-muted,#71717A)]">
            subdomain: {SEEDED_SUBDOMAIN} · failStage: {failStage ?? "none"} · speed: {speed}ms
          </span>
        </div>

        <AcquisitionProbe initialUrl={profileUrl} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-6">
            <GenerationExperienceView experience={experience} />
          </div>
          <ActivityFeedView experience={experience} snapshot={snapshot} className="self-start" />
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
