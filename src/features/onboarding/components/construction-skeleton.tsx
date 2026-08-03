"use client";

/**
 * Construction skeletons — IMPLEMENTATION-29.
 *
 * Tasteful placeholders shown ONLY for storefront portions whose workflow stage
 * has not completed yet. Each skeleton mirrors the final layout (not generic
 * grey blocks) and is theme-variable aware. Reduced motion disables pulse.
 */
import { cn } from "@/lib/utils";
import type { ConstructionStepConfig } from "@/lib/generation/construction/config";

const bar = "animate-pulse motion-reduce:animate-none rounded-md bg-[var(--surface-card,#27272A)]";

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className={cn(bar, "h-5 w-40")} aria-hidden="true" />
      <div className={cn(bar, "h-4 w-16 opacity-60")} aria-hidden="true" />
    </div>
  );
}

function NavSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border,rgba(255,255,255,0.08))] px-6 py-4">
      <div className="flex items-center gap-2">
        <div className={cn(bar, "h-6 w-6 rounded-full")} aria-hidden="true" />
        <div className={cn(bar, "h-3 w-20")} aria-hidden="true" />
      </div>
      <div className="flex items-center gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn(bar, "h-3 w-12 opacity-50")} aria-hidden="true" />
        ))}
        <div className={cn(bar, "h-7 w-20 rounded-full opacity-70")} aria-hidden="true" />
      </div>
    </div>
  );
}

function HeroSkeleton() {
  return (
    <div className="grid grid-cols-1 items-center gap-8 px-6 py-14 md:grid-cols-2">
      <div className="space-y-4">
        <div className={cn(bar, "h-8 w-3/4")} aria-hidden="true" />
        <div className={cn(bar, "h-8 w-1/2")} aria-hidden="true" />
        <div className="space-y-2 pt-2">
          <div className={cn(bar, "h-3 w-full opacity-60")} aria-hidden="true" />
          <div className={cn(bar, "h-3 w-5/6 opacity-60")} aria-hidden="true" />
          <div className={cn(bar, "h-3 w-4/6 opacity-60")} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-3 pt-3">
          <div className={cn(bar, "h-9 w-28 rounded-full")} aria-hidden="true" />
          <div className={cn(bar, "h-9 w-28 rounded-full opacity-50")} aria-hidden="true" />
        </div>
      </div>
      <div
        className={cn(bar, "relative aspect-[4/3] rounded-xl")}
        aria-hidden="true"
        role="img"
        aria-label="Hero media placeholder"
      />
    </div>
  );
}

function GridSkeleton() {
  return (
    <div className="space-y-6 px-6 py-10">
      <SectionHeader title="section" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-3 rounded-xl border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] p-4">
            <div className={cn(bar, "aspect-[3/2] rounded-lg")} aria-hidden="true" />
            <div className={cn(bar, "h-3 w-3/4")} aria-hidden="true" />
            <div className={cn(bar, "h-3 w-1/2 opacity-60")} aria-hidden="true" />
            <div className={cn(bar, "h-6 w-20 rounded-full opacity-70")} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function StackSkeleton() {
  return (
    <div className="space-y-6 px-6 py-10">
      <SectionHeader title="section" />
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 rounded-xl border border-[var(--border,rgba(255,255,255,0.08))] bg-[var(--surface-card,#18181B)] p-4">
            <div className={cn(bar, "h-9 w-9 rounded-lg")} aria-hidden="true" />
            <div className="flex-1 space-y-2">
              <div className={cn(bar, "h-3 w-2/5")} aria-hidden="true" />
              <div className={cn(bar, "h-2 w-4/5 opacity-60")} aria-hidden="true" />
            </div>
            <div className={cn(bar, "h-5 w-5 rounded-full opacity-50")} aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FooterSkeleton() {
  return (
    <div className="border-t border-[var(--border,rgba(255,255,255,0.08))] px-6 py-8">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2">
          <div className={cn(bar, "h-5 w-5 rounded-full")} aria-hidden="true" />
          <div className={cn(bar, "h-3 w-24")} aria-hidden="true" />
        </div>
        <div className="flex items-center gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={cn(bar, "h-6 w-6 rounded-full opacity-60")} aria-hidden="true" />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Renders the placeholder for a construction step by its skeleton key. */
export function ConstructionSkeleton({ step }: { step: ConstructionStepConfig }) {
  switch (step.skeleton) {
    case "nav":
      return <NavSkeleton />;
    case "hero":
      return <HeroSkeleton />;
    case "grid":
      return <GridSkeleton />;
    case "stack":
      return <StackSkeleton />;
    case "footer":
      return <FooterSkeleton />;
    default:
      return null;
  }
}
