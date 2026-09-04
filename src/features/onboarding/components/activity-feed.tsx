"use client";

/**
 * AI Activity Feed View — IMPLEMENTATION-30.
 *
 * A deployment-log style timeline of REAL workflow milestones. Pure consumer of
 * the Activity Feed Runtime — it never owns state or timing. Reuses the
 * Generation Animation primitives for enter/complete/glow microinteractions.
 */
import {
  Settings2,
  Download,
  Brain,
  Sparkles,
  Image as ImageIcon,
  BadgeCheck,
  Rocket,
  CheckCircle2,
  AlertTriangle,
  Minus,
  Activity,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FadeIn, SuccessIcon, GlowIndicator } from "@/lib/generation/animation/primitives";
import { useActivityFeed, type ActivityState } from "@/lib/generation/activity/runtime";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { ActivitySnapshotInput } from "@/lib/generation/activity/runtime";
import { ACTIVITY_CATEGORIES } from "@/lib/generation/activity/config";

/** Single icon registry (config stores keys; this is the only mapping). */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Settings2,
  Download,
  Brain,
  Sparkles,
  Image: ImageIcon,
  BadgeCheck,
  Rocket,
  CheckCircle2,
};

function StatusIcon({ activity }: { activity: ActivityState }) {
  switch (activity.status) {
    case "completed":
      return (
        <SuccessIcon>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-[var(--color-success)]" />
        </SuccessIcon>
      );
    case "failed":
      return <AlertTriangle className="h-4 w-4 shrink-0 text-[var(--color-danger)]" />;
    case "skipped":
    case "cancelled":
      return <Minus className="h-4 w-4 shrink-0 text-[var(--text-muted,#71717A)]" />;
    case "running":
      return activity.isActive ? (
        <GlowIndicator className="shrink-0 !h-3.5 !w-3.5" />
      ) : (
        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--brand-primary,#6366F1)]/50" />
      );
    default:
      return (
        <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-full border border-[var(--border,rgba(255,255,255,0.12))]" />
      );
  }
}

export function ActivityFeedView({
  experience,
  snapshot,
  className,
  title = "AI Activity",
}: {
  experience: GenerationExperience;
  snapshot?: ActivitySnapshotInput | null;
  className?: string;
  title?: string;
}) {
  const activities = useActivityFeed(experience, snapshot);
  const hasFailure = experience.hasFailure;
  const activeCategory = activities.find((a) => a.isActive)?.category ?? null;

  return (
    <div
      className={cn("overflow-hidden rounded-xl border border-[var(--border,rgba(255,255,255,0.1))] bg-[var(--surface-card,#18181B)]", className)}
      data-testid="activity-feed"
    >
      <div className="flex items-center justify-between border-b border-[var(--border,rgba(255,255,255,0.08))] px-4 py-2.5">
        <span className="flex items-center gap-2 text-xs font-medium text-[var(--text-primary,#FAFAFA)]">
          <Activity className="h-3.5 w-3.5 text-[var(--brand-primary,#6366F1)]" />
          {title}
        </span>
        {activeCategory && (
          <span className="rounded-full border border-[var(--brand-primary,#6366F1)]/30 bg-[var(--brand-primary,#6366F1)]/10 px-2 py-0.5 text-[9px] uppercase tracking-wide text-[var(--brand-primary,#6366F1)]">
            {ACTIVITY_CATEGORIES.find((c) => c.id === activeCategory)?.label}
          </span>
        )}
      </div>

      <div role="log" aria-live="polite" aria-label="AI activity timeline" className="max-h-[320px] overflow-y-auto px-2 py-2">
        <ol className="space-y-0.5">
          {activities.map((activity) => {
            const CategoryIcon = CATEGORY_ICONS[activity.category] ?? Activity;
            const isCompleted = activity.status === "completed" || activity.status === "skipped" || activity.status === "cancelled";
            return (
              <li
                key={activity.id}
                role="listitem"
                data-activity={activity.id}
                data-activity-status={activity.status}
                data-activity-active={String(activity.isActive)}
              >
                <FadeIn
                  className={cn(
                    "flex items-start gap-3 rounded-lg px-2 py-2",
                    activity.status === "running" && activity.isActive && "bg-[var(--brand-primary,#6366F1)]/[0.06]",
                    activity.status === "failed" && "bg-red-500/5",
                    activity.status === "pending" && "opacity-60",
                  )}
                >
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                    <StatusIcon activity={activity} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <CategoryIcon className="h-3.5 w-3.5 shrink-0 text-[var(--text-muted,#71717A)]" />
                      <span className="truncate text-xs font-medium text-[var(--text-primary,#FAFAFA)]">
                        {activity.title}
                      </span>
                      {activity.metadata && (
                        <span className="ml-auto flex shrink-0 items-center gap-1">
                          {Object.entries(activity.metadata).map(([key, value]) => (
                            <span
                              key={key}
                              className="rounded-full border border-[var(--border,rgba(255,255,255,0.08))] px-1.5 py-0.5 text-[9px] text-[var(--text-secondary,#A1A1AA)]"
                              data-activity-metadata={key}
                            >
                              {key}: {value}
                            </span>
                          ))}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[10px] text-[var(--text-muted,#71717A)]">{activity.description}</p>
                  </div>
                  <span className="mt-0.5 shrink-0 text-[10px] tabular-nums text-[var(--text-muted,#71717A)]" aria-hidden="true">
                    {activity.status === "running" && activity.isActive ? "now" : activity.ageLabel}
                  </span>
                </FadeIn>
              </li>
            );
          })}
        </ol>
      </div>

      {hasFailure && (
        <div className="border-t border-[var(--color-danger-border)] bg-[var(--color-danger-surface)] px-4 py-2.5" data-activity-failure>
          <p className="text-[11px] font-medium text-[var(--color-danger)]">Building paused</p>
          <p className="mt-0.5 text-[10px] text-[var(--text-secondary,#A1A1AA)]">
            Completed activity history is preserved. You can retry.
          </p>
        </div>
      )}
    </div>
  );
}
