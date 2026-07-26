import type { GenerationSessionData, StageRecord, StageType } from "./types";
import { STAGE_WEIGHTS, calculateProgress } from "./types";

export interface ProgressInfo {
  percent: number;
  currentStage: StageType | null;
  currentStageLabel: string | null;
  completedStages: number;
  totalStages: number;
  elapsedMs: number;
  estimatedRemainingMs: number | null;
  stageProgress: StageProgressInfo[];
}

export interface StageProgressInfo {
  type: StageType;
  label: string;
  status: string;
  weight: number;
  duration: number | null;
  error: string | null;
}

const STAGE_LABELS: Record<StageType, string> = {
  import_profile: "Import Profile",
  knowledge_intelligence: "Knowledge Intelligence",
  persona_detection: "Persona Detection",
  planning_context: "Planning Context",
  experience_planning: "Experience Planning",
  composition: "Composition",
  artifact_generation: "Artifact Generation",
  provisioning: "Provisioning",
  publishing: "Publishing",
  golden_validation: "Golden Validation",
};

export function computeProgress(session: GenerationSessionData): ProgressInfo {
  const stages = session.stages;
  const totalStages = stages.length;

  const completedStages = stages.filter(
    (s) => s.status === "completed" || s.status === "skipped",
  ).length;

  const percent = session.progressPercent > 0
    ? session.progressPercent
    : calculateProgress(stages);

  const elapsedMs = Date.now() - session.startedAt.getTime();

  const estimatedRemainingMs = percent > 0 && percent < 100
    ? Math.round((elapsedMs / percent) * (100 - percent))
    : null;

  const stageProgress: StageProgressInfo[] = stages.map((s: StageRecord) => ({
    type: s.type,
    label: STAGE_LABELS[s.type] ?? s.type,
    status: s.status,
    weight: STAGE_WEIGHTS[s.type] ?? 5,
    duration: s.duration,
    error: s.error,
  }));

  return {
    percent,
    currentStage: session.currentStage,
    currentStageLabel: session.currentStage ? (STAGE_LABELS[session.currentStage] ?? session.currentStage) : null,
    completedStages,
    totalStages,
    elapsedMs,
    estimatedRemainingMs,
    stageProgress,
  };
}
