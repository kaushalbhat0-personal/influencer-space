"use client";

/**
 * Construction Preview — IMPLEMENTATION-29.
 *
 * A lightweight, presentational view that shows the storefront being assembled
 * as REAL generation stages complete. It is NOT the Builder and NOT a second
 * renderer: completed sections render through the single ComponentRenderer with
 * the real runtime snapshot data; uncompleted portions show layout-mirroring
 * skeletons. The Construction Runtime drives eligibility; nothing is simulated.
 */
import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ComponentRenderer } from "@/lib/renderer";
import { StorefrontNav } from "@/components/storefront/StorefrontNav";
import { FadeIn, TransitionGroup } from "@/lib/generation/animation/primitives";
import { useConstructionRuntime } from "@/lib/generation/construction/runtime";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { ConstructionSnapshotData } from "@/actions/construction.actions";
import { CONSTRUCTION_STEPS } from "@/lib/generation/construction/config";
import { ConstructionSkeleton } from "./construction-skeleton";

function matchesReveal(moduleId: string, reveals: string[]): boolean {
  return reveals.some((prefix) => moduleId.startsWith(prefix + ".") || moduleId === prefix);
}

export function ConstructionPreview({
  experience,
  snapshot,
  subdomain,
  title = "Live construction",
}: {
  experience: GenerationExperience;
  snapshot: ConstructionSnapshotData | null;
  subdomain: string;
  title?: string;
}) {
  const construction = useConstructionRuntime(experience);
  const navEligible =
    construction.steps.find((s) => s.id === "nav")?.isEligible ?? false;
  const themeEligible = construction.themeEligible;

  return (
    <div
      className="overflow-hidden rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-root,#09090B)]"
      data-testid="construction-preview"
      data-theme-eligible={String(themeEligible)}
    >
      {/* Browser chrome */}
      <div className="flex items-center gap-2 border-b border-[var(--border,rgba(255,255,255,0.08))] px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--live,#EF4444)] opacity-70" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400 opacity-70" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 opacity-70" />
        </div>
        <div className="mx-auto flex h-6 flex-1 max-w-xs items-center justify-center rounded-md bg-[var(--surface-card-hover,#27272A)] px-3 text-[10px] text-[var(--text-muted,#71717A)]">
          {subdomain}.creator.store
        </div>
        <span className="flex items-center gap-1.5 text-[10px] text-[var(--text-muted,#71717A)]" data-testid="construction-status">
          {construction.currentStep ? (
            <>
              <Loader2 className="h-3 w-3" />
              {construction.currentStep.title}
            </>
          ) : construction.isComplete ? (
            "Construction complete"
          ) : (
            "Assembling"
          )}
        </span>
      </div>

      {/* Construction step chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-[var(--border,rgba(255,255,255,0.08))] px-4 py-2" aria-hidden="true">
        {CONSTRUCTION_STEPS.filter((s) => s.dependsOnStage).map((step) => {
          const state = construction.steps.find((s) => s.id === step.id);
          return (
            <span
              key={step.id}
              data-construction-chip={step.id}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-wide",
                state?.status === "completed"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : state?.status === "running"
                    ? "border-[var(--brand-primary,#6366F1)]/40 bg-[var(--brand-primary,#6366F1)]/10 text-[var(--brand-primary,#6366F1)]"
                    : "border-[var(--border,rgba(255,255,255,0.08))] text-[var(--text-muted,#71717A)]",
              )}
            >
              {state?.status === "completed" ? <Check className="h-2.5 w-2.5" /> : null}
              {step.title}
            </span>
          );
        })}
      </div>

      {/* Storefront frame — theme vars applied when the real theme stage completes */}
      <div
        className="relative transition-colors duration-500 motion-reduce:transition-none"
        style={themeEligible && snapshot ? (snapshot.theme as React.CSSProperties) : undefined}
      >
        <div className="pointer-events-none select-none">
          <div className="mx-auto max-w-5xl px-4 py-6">
            {navEligible && snapshot ? (
              <div data-construction-step="nav" data-status="completed">
                <StorefrontNav sections={snapshot.navigation as Parameters<typeof StorefrontNav>[0]["sections"]} />
              </div>
            ) : (
              <div data-construction-step="nav" data-status="pending" data-skeleton="nav">
                <ConstructionSkeleton step={CONSTRUCTION_STEPS.find((s) => s.id === "nav")!} />
              </div>
            )}

            {/* RCCF-RESPONSIVE-03: named container boundary for the rendered
                storefront sections — mirrors live <main>. Container variants
                (@sm/main:/@lg/main:) resolve against this width, so desktop
                ConstructionPreview keeps desktop layouts (the hero was already
                container-query based since RCCF-02 and needs this ancestor). */}
            <main className="@container/main space-y-2">
              {construction.steps
                .filter((s) => s.reveals.length > 0)
                .map((step) => {
                  const eligible = step.isEligible && !!snapshot;
                  const sections =
                    snapshot?.sections.filter((s) => matchesReveal(s.moduleId, step.reveals)) ?? [];

                  return (
                    <TransitionGroup key={step.id}>
                      {eligible ? (
                        <FadeIn
                          key={`${step.id}-real`}
                          dataStage={step.id}
                          dataStatus="completed"
                          className={cn(step.animation === "crossfade" && "py-2")}
                        >
                          {sections.length === 0 ? (
                            <p className="px-6 py-6 text-xs text-[var(--text-muted,#71717A)]" data-construction-empty={step.id}>
                              No {step.id} content yet
                            </p>
                          ) : (
                            sections.map((section) => (
                              <section
                                key={section.sectionId}
                                data-construction-step={step.id}
                                data-construction-section={section.moduleId}
                                data-status="completed"
                                className="rounded-xl border border-[var(--border,rgba(255,255,255,0.04))]"
                              >
                                <ComponentRenderer componentId={section.moduleId} props={section.config} />
                              </section>
                            ))
                          )}
                        </FadeIn>
                      ) : (
                        <FadeIn
                          key={`${step.id}-skeleton`}
                          dataStage={step.id}
                          dataStatus={step.status}
                          dataSkeleton={step.id}
                        >
                          <ConstructionSkeleton step={step} />
                        </FadeIn>
                      )}
                    </TransitionGroup>
                  );
                })}
            </main>

            {construction.isFailure && (
              <div className="mt-6 rounded-lg border border-red-500/20 bg-red-500/10 p-4" data-construction-failure>
                <p className="text-xs font-medium text-red-400">Construction paused</p>
                <p className="mt-1 text-[10px] text-[var(--text-secondary,#A1A1AA)]">
                  Completed sections are preserved. You can retry the build.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
