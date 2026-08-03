"use client";

/**
 * AI Activity Feed Runtime — IMPLEMENTATION-30.
 *
 * A pure consumer of the Generation Experience. It derives activity status,
 * timestamps and metadata ENTIRELY from the runtime (completed stages, elapsed
 * time, stage durations, the real storefront snapshot). No timers, no polling,
 * no simulated events, no invented numbers.
 *
 * Flow:
 *   Generation Experience (+ optional runtime snapshot)
 *     → buildActivityState() → Activity Feed View
 */
import { useMemo } from "react";
import type { GenerationExperience } from "@/features/onboarding/use-generation-experience";
import type { GenerationStageId } from "@/lib/generation/experience/stages";
import {
  ACTIVITY_DEFINITIONS,
  ACTIVITY_CATEGORIES,
  type ActivityDefinition,
  type ActivityStatus,
  type ActivitySeverity,
  type ActivityCategoryId,
} from "./config";

export interface ActivitySnapshotInput {
  meta: {
    themeId: string | null;
    creatorName: string | null;
    tagline: string | null;
  };
  sections: Array<{ moduleId: string; config: Record<string, unknown> }>;
}

export interface ActivityState extends ActivityDefinition {
  status: ActivityStatus;
  severity: ActivitySeverity;
  /** Cumulative completed runtime duration up to this activity (ms), if known. */
  timestampMs: number | null;
  /** "Just now" / "3s ago" — derived from the existing elapsed source. */
  ageLabel: string | null;
  /** Real metadata attached ONLY when the runtime provides it. */
  metadata: Record<string, string | number> | null;
  /** The newest activity currently running. */
  isActive: boolean;
}

function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return "0s";
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${seconds % 60}s`;
}

/** Pure — elapsed label relative to the workflow's total elapsed time. */
export function deriveAgeLabel(timestampMs: number, totalElapsedMs: number): string {
  const age = Math.max(0, totalElapsedMs - timestampMs);
  if (age < 1000) return "Just now";
  return `${formatDuration(age)} ago`;
}

function stageIndex(stage: GenerationStageId | null): number {
  if (!stage) return -1;
  // Use the canonical generation order (defined in the experience stages).
  const order: GenerationStageId[] = [
    "import_profile",
    "knowledge_intelligence",
    "persona_detection",
    "planning_context",
    "experience_planning",
    "composition",
    "artifact_generation",
    "provisioning",
    "publishing",
    "golden_validation",
  ];
  return order.indexOf(stage);
}

function severityFor(status: ActivityStatus, fallback?: ActivitySeverity): ActivitySeverity {
  switch (status) {
    case "completed":
      return fallback ?? "success";
    case "failed":
      return "error";
    case "skipped":
      return "warning";
    case "running":
      return fallback ?? "info";
    default:
      return fallback ?? "info";
  }
}

/** Pure — derive hero media label from the real resolved hero config. */
export function heroMediaLabel(snapshot: ActivitySnapshotInput | null | undefined): string | null {
  if (!snapshot) return null;
  const hero = snapshot.sections.find((s) => s.moduleId.startsWith("hero."));
  const kind = hero?.config?.resolvedMedia;
  if (kind === "video") return "Video";
  if (kind === "image") return "Image";
  if (kind === "background") return "Background";
  return null;
}

/** Pure — derive real section counts from the snapshot (never fabricated). */
export function sectionCounts(
  snapshot: ActivitySnapshotInput | null | undefined,
): Record<string, number> | null {
  if (!snapshot || snapshot.sections.length === 0) return null;
  const counts: Record<string, number> = {};
  for (const section of snapshot.sections) {
    const prefix = section.moduleId.split(".")[0];
    counts[prefix] = (counts[prefix] ?? 0) + 1;
  }
  return counts;
}

function deriveMetadata(
  activity: ActivityDefinition,
  snapshot: ActivitySnapshotInput | null | undefined,
): Record<string, string | number> | null {
  if (!snapshot) return null;
  switch (activity.metadataKind) {
    case "theme": {
      const themeId = snapshot.meta.themeId;
      if (!themeId) return null;
      return { theme: themeId.includes(".") ? themeId.split(".").pop()! : themeId };
    }
    case "heroMedia": {
      const label = heroMediaLabel(snapshot);
      return label ? { media: label } : null;
    }
    case "sections": {
      const counts = sectionCounts(snapshot);
      if (!counts) return null;
      return { sections: counts.products ?? 0, products: counts.products ?? 0, services: counts.services ?? 0 };
    }
    default:
      return null;
  }
}

/** Pure — derive the full activity state from the runtime experience + snapshot. */
export function buildActivityState(
  experience: GenerationExperience,
  snapshot?: ActivitySnapshotInput | null,
): ActivityState[] {
  const totalElapsedMs = experience.elapsedMs;

  const cumulativeDurations: number[] = [];
  let runningSum = 0;
  for (const stage of experience.stages) {
    if (stage.duration != null && Number.isFinite(stage.duration)) runningSum += stage.duration;
    cumulativeDurations.push(runningSum);
  }

  const activities = ACTIVITY_DEFINITIONS.map((activity) => {
    const idx = stageIndex(activity.dependsOnStage);
    const stage = activity.dependsOnStage ? experience.stages.find((s) => s.id === activity.dependsOnStage) : null;
    const stageStatus = stage?.status ?? null;

    let status: ActivityStatus;
    if (activity.terminal) {
      status = experience.isComplete ? "completed" : experience.hasFailure ? "pending" : "pending";
    } else if (!activity.dependsOnStage) {
      // Base activity (e.g. "Preparing workspace") — always complete once started.
      status = "completed";
    } else if (stageStatus === "completed" || stageStatus === "skipped") {
      status = stageStatus;
    } else if (stageStatus === "failed") {
      status = "failed";
    } else if (stageStatus === "running") {
      status = "running";
    } else {
      status = "pending";
    }

    // Timestamp = cumulative completed duration up to this activity's stage.
    let timestampMs: number | null = null;
    if (activity.terminal) {
      if (experience.isComplete && cumulativeDurations.length > 0) {
        timestampMs = cumulativeDurations[cumulativeDurations.length - 1];
      }
    } else if (idx >= 0) {
      const stageCompleted = status === "completed" || status === "skipped";
      if (stageCompleted && stage?.duration != null) {
        timestampMs = cumulativeDurations[idx];
      } else if (stageCompleted && cumulativeDurations[idx] !== undefined && stage?.duration == null) {
        timestampMs = null;
      }
    }

    return {
      ...activity,
      status,
      severity: severityFor(status, activity.severity),
      timestampMs,
      ageLabel: timestampMs != null ? deriveAgeLabel(timestampMs, totalElapsedMs) : null,
      metadata: deriveMetadata(activity, snapshot),
      isActive: false,
    };
  });

  // Newest running activity is marked active (the one the user should watch).
  for (let i = activities.length - 1; i >= 0; i--) {
    if (activities[i].status === "running") {
      activities[i] = { ...activities[i], isActive: true };
      break;
    }
  }

  return activities;
}

/** Memoized hook — pure consumer of the experience (and optional snapshot). */
export function useActivityFeed(
  experience: GenerationExperience,
  snapshot?: ActivitySnapshotInput | null,
): ActivityState[] {
  return useMemo(() => buildActivityState(experience, snapshot), [experience, snapshot]);
}

export { ACTIVITY_DEFINITIONS, ACTIVITY_CATEGORIES };
export type { ActivityCategoryId };
