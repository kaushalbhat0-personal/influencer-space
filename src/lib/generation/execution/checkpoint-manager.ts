import type { CheckpointRepository, PipelineStage, GenerationId } from "@/lib/generation/contracts";

interface CheckpointRow {
  stageId: string;
  status: string;
  output: Record<string, unknown>;
}

export class CheckpointManager {
  constructor(private repository: CheckpointRepository) {}

  async load(generationId: string) {
    return this.repository.findByGenerationId(generationId as GenerationId);
  }

  async save(generationId: string, stageId: string, status: string, output: Record<string, unknown>) {
    return this.repository.save(generationId as GenerationId, { stageId, status, output });
  }

  async clear(generationId: string) {
    return this.repository.deleteByGenerationId(generationId as GenerationId);
  }

  completedStages(checkpoints: CheckpointRow[]): string[] {
    return checkpoints.filter((c) => c.status === "completed").map((c) => c.stageId);
  }

  failedStages(checkpoints: CheckpointRow[]): string[] {
    return checkpoints.filter((c) => c.status === "failed").map((c) => c.stageId);
  }

  resumeFrom(
    stages: readonly { type: PipelineStage }[],
    checkpoints: CheckpointRow[],
  ): readonly { type: PipelineStage }[] {
    const completed = new Set(this.completedStages(checkpoints));
    const failed = new Set(this.failedStages(checkpoints));

    const firstUncompletedIndex = stages.findIndex(
      (s) => !completed.has(s.type) && !failed.has(s.type),
    );

    if (firstUncompletedIndex === -1) return [];
    return stages.slice(firstUncompletedIndex);
  }

  nextStage(
    stages: readonly { type: PipelineStage }[],
    checkpoints: CheckpointRow[],
  ): { type: PipelineStage } | null {
    const completed = new Set(this.completedStages(checkpoints));
    for (const s of stages) {
      if (!completed.has(s.type)) return s;
    }
    return null;
  }

  isStageCompleted(checkpoints: CheckpointRow[], stageId: string): boolean {
    return checkpoints.some((c) => c.stageId === stageId && c.status === "completed");
  }

  getCheckpoint(checkpoints: CheckpointRow[], stageId: string): CheckpointRow | null {
    return checkpoints.find((c) => c.stageId === stageId) ?? null;
  }
}
