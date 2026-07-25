import type { PipelineStageDef, StageRegistry } from "@/lib/generation/contracts";
import type { PipelineStage } from "@/lib/generation/contracts";

export class PipelineStageRegistry implements StageRegistry {
  private stages = new Map<PipelineStage, PipelineStageDef>();
  private locked = false;

  register(stage: PipelineStageDef): void {
    if (this.locked) throw new Error("PipelineStageRegistry is locked after bootstrap");
    if (this.stages.has(stage.type)) throw new Error(`Stage already registered: ${stage.type}`);
    this.stages.set(stage.type, stage);
  }

  unregister(type: PipelineStage): void {
    if (this.locked) throw new Error("PipelineStageRegistry is locked after bootstrap");
    this.stages.delete(type);
  }

  get(type: PipelineStage): PipelineStageDef | undefined {
    return this.stages.get(type);
  }

  getAll(): PipelineStageDef[] {
    return Array.from(this.stages.values());
  }

  resolve(type: PipelineStage): PipelineStageDef {
    const stage = this.stages.get(type);
    if (!stage) throw new Error(`Unknown pipeline stage: ${type}`);
    return stage;
  }

  lock(): void {
    this.locked = true;
  }

  isLocked(): boolean {
    return this.locked;
  }
}
