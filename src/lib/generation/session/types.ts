export const SESSION_STATUSES = [
  "created",
  "queued",
  "running",
  "publishing",
  "completed",
  "failed",
  "cancelled",
  "timed_out",
  "retrying",
] as const;

export type SessionStatus = (typeof SESSION_STATUSES)[number];

export const STAGE_TYPES = [
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
] as const;

export type StageType = (typeof STAGE_TYPES)[number];

export const STAGE_STATUSES = [
  "pending",
  "running",
  "completed",
  "skipped",
  "failed",
] as const;

export type StageStatus = (typeof STAGE_STATUSES)[number];

export const HISTORY_EVENT_TYPES = [
  "stage_started",
  "stage_completed",
  "stage_failed",
  "status_changed",
  "progress_updated",
  "error_occurred",
  "warning_added",
  "retry_initiated",
  "workflow_linked",
] as const;

export type HistoryEventType = (typeof HISTORY_EVENT_TYPES)[number];

export interface StageRecord {
  type: StageType;
  status: StageStatus;
  startedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  error: string | null;
}

export interface HistoryEvent {
  type: HistoryEventType;
  timestamp: Date;
  data: Record<string, unknown>;
}

export interface GenerationSessionData {
  id: string;
  workspaceId: string;
  creatorId: string | null;
  creatorName: string;
  sourceUrl: string | null;
  platform: string | null;
  correlationId: string | null;
  status: SessionStatus;
  currentStage: StageType | null;
  progressPercent: number;
  startedAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
  duration: number | null;
  workflowId: string | null;
  evaluationScore: number | null;
  goldenValidationScore: number | null;
  artifactVersion: number | null;
  storefrontUrl: string | null;
  builderUrl: string | null;
  dashboardUrl: string | null;
  retryCount: number;
  maxRetries: number;
  error: string | null;
  warnings: string[];
  stages: StageRecord[];
  history: HistoryEvent[];
}

export interface CreateSessionInput {
  workspaceId: string;
  creatorId?: string;
  creatorName: string;
  sourceUrl?: string;
  platform?: string;
  maxRetries?: number;
  correlationId?: string;
}

export interface UpdateSessionInput {
  status?: SessionStatus;
  currentStage?: StageType | null;
  progressPercent?: number;
  workflowId?: string;
  evaluationScore?: number;
  goldenValidationScore?: number;
  artifactVersion?: number;
  storefrontUrl?: string;
  builderUrl?: string;
  dashboardUrl?: string;
  error?: string | null;
  warnings?: string[];
}

export interface StageUpdateInput {
  type: StageType;
  status: StageStatus;
  error?: string;
}

export const STAGE_WEIGHTS: Record<StageType, number> = {
  import_profile: 5,
  knowledge_intelligence: 10,
  persona_detection: 10,
  planning_context: 10,
  experience_planning: 15,
  composition: 10,
  artifact_generation: 10,
  provisioning: 15,
  publishing: 10,
  golden_validation: 5,
};

export const STATUS_TRANSITIONS: Record<SessionStatus, readonly SessionStatus[]> = {
  created: ["queued", "cancelled"],
  queued: ["running", "cancelled"],
  running: ["publishing", "failed", "cancelled", "timed_out"],
  publishing: ["completed", "failed", "cancelled", "timed_out"],
  completed: [],
  failed: ["retrying"],
  cancelled: [],
  timed_out: ["retrying"],
  retrying: ["queued", "failed"],
};

export function isValidTransition(from: SessionStatus, to: SessionStatus): boolean {
  const allowed = STATUS_TRANSITIONS[from];
  if (!allowed) return false;
  return allowed.includes(to);
}

export function calculateProgress(stages: StageRecord[]): number {
  if (stages.length === 0) return 0;

  const totalWeight = Object.values(STAGE_WEIGHTS).reduce((sum, w) => sum + w, 0);
  let completedWeight = 0;

  for (const stage of stages) {
    const weight = STAGE_WEIGHTS[stage.type] ?? 5;
    if (stage.status === "completed" || stage.status === "skipped") {
      completedWeight += weight;
    } else if (stage.status === "running") {
      completedWeight += weight * 0.5;
    }
  }

  return Math.round((completedWeight / totalWeight) * 100);
}

export const STAGE_LABELS: Record<StageType, string> = {
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

export function getStageLabel(type: StageType): string {
  return STAGE_LABELS[type] ?? type;
}
