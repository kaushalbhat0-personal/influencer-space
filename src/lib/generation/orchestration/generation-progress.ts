import type { GenerationId, StageResultRow } from "@/lib/generation/contracts";
import { GenerationProgress as GP } from "@/lib/generation/contracts";

export interface ProgressInfo {
  status: string;
  progress: number;
  currentStage: string | null;
  elapsedMs: number;
  estimatedRemainingMs: number;
  stagesCompleted: number;
  totalStages: number;
}

export class GenerationProgressTracker {
  track(
    generationId: GenerationId,
    status: string,
    stages: StageResultRow[],
    elapsedMs: number,
    totalStages: number,
  ): ProgressInfo {
    const completed = stages.filter((s) => s.status === "completed").length;
    const failed = stages.filter((s) => s.status === "failed").length;
    const running = stages.filter((s) => s.status === "running").length;
    const currentStage = running > 0
      ? stages.find((s) => s.status === "running")?.stage ?? null
      : null;

    let progress = 0;
    if (totalStages > 0) {
      const completedWeight = completed / totalStages;
      const failedWeight = failed / totalStages;
      const runningWeight = running > 0 ? 0.5 / totalStages : 0;
      progress = Math.round((completedWeight + failedWeight + runningWeight) * 100);
    } else if (status === "completed") {
      progress = 100;
    }

    if (status === "completed" || status === "failed" || status === "cancelled") {
      progress = status === "completed" ? 100 : Math.max(progress, (completed / Math.max(totalStages, 1)) * 100);
    }

    const avgStageMs = elapsedMs / Math.max(completed, 1);
    const remainingStages = totalStages - completed - failed;
    const estimatedRemainingMs = Math.round(avgStageMs * remainingStages);

    return {
      status,
      progress: Math.min(100, Math.max(0, progress)),
      currentStage,
      elapsedMs,
      estimatedRemainingMs,
      stagesCompleted: completed,
      totalStages,
    };
  }

  toGenerationProgress(info: ProgressInfo): GP {
    return new GP(info.currentStage ?? "idle", info.progress, info.status);
  }
}
