/**
 * Generation Experience Model — IMPLEMENTATION-27.
 *
 * The SINGLE source of truth describing onboarding generation progress.
 * Stages are configuration-driven (id, title, description, icon, weight).
 * Status is derived from the REAL workflow runtime (session stages) — never
 * simulated, never timer-driven, never hardcoded percentages.
 *
 * Future animation phases consume this model (timeline, particles, canvas
 * transitions, section reveals, streaming, skeletons) without introducing new
 * loading implementations.
 */

export type GenerationStageId =
  | "import_profile"
  | "knowledge_intelligence"
  | "persona_detection"
  | "planning_context"
  | "experience_planning"
  | "composition"
  | "artifact_generation"
  | "provisioning"
  | "publishing"
  | "golden_validation";

export type GenerationStageStatus = "pending" | "running" | "completed" | "skipped" | "failed";

export interface GenerationStageConfig {
  id: GenerationStageId;
  title: string;
  description: string;
  /** Lucide icon key (data, not a component) so the config stays serializable. */
  icon: string;
  /** Relative weight used to DERIVE progress from actually-completed stages. */
  estimatedWeight: number;
  status: GenerationStageStatus;
  error?: string | null;
  duration?: number | null;
}

export interface RuntimeStageEvent {
  type: string;
  status: string;
  error?: string | null;
  duration?: number | null;
}

/** The canonical stage sequence (order matters). */
export const GENERATION_STAGES: GenerationStageConfig[] = [
  { id: "import_profile", title: "Fetching creator profile", description: "Reading your social profile and public details", icon: "Link", estimatedWeight: 5, status: "pending" },
  { id: "knowledge_intelligence", title: "Learning about your brand", description: "Mapping your content, audience and brand signals", icon: "Brain", estimatedWeight: 10, status: "pending" },
  { id: "persona_detection", title: "Detecting persona", description: "Understanding your voice and positioning", icon: "User", estimatedWeight: 10, status: "pending" },
  { id: "planning_context", title: "Planning experience", description: "Structuring the storefront experience", icon: "Map", estimatedWeight: 10, status: "pending" },
  { id: "experience_planning", title: "Planning content", description: "Deciding pages, sections and content strategy", icon: "Layout", estimatedWeight: 10, status: "pending" },
  { id: "composition", title: "Composing storefront", description: "Composing the layout and sections", icon: "LayoutGrid", estimatedWeight: 15, status: "pending" },
  { id: "artifact_generation", title: "Generating sections", description: "Writing content, products and media", icon: "Sparkles", estimatedWeight: 15, status: "pending" },
  { id: "provisioning", title: "Setting up your workspace", description: "Creating your storefront workspace", icon: "Database", estimatedWeight: 10, status: "pending" },
  { id: "publishing", title: "Publishing storefront", description: "Publishing your live site", icon: "Rocket", estimatedWeight: 10, status: "pending" },
  { id: "golden_validation", title: "Finalizing", description: "Running quality checks", icon: "BadgeCheck", estimatedWeight: 5, status: "pending" },
];

export const TOTAL_STAGE_WEIGHT: number = GENERATION_STAGES.reduce(
  (sum, s) => sum + s.estimatedWeight,
  0,
);

/** Map a runtime stage event's status to the model's status (pending fallback). */
export function deriveStageStatus(
  events: RuntimeStageEvent[],
  id: GenerationStageId,
): GenerationStageStatus {
  const event = events.find((e) => e.type === id);
  const status = event?.status;
  if (status === "completed" || status === "skipped" || status === "failed" || status === "running") {
    return status as GenerationStageStatus;
  }
  return "pending";
}

/**
 * Progress DERIVED from actually-completed stages (weighted). This can never
 * exceed reality — a running/pending stage contributes zero. The UI may also
 * use the workflow runtime's own progressPercent; this is the conservative
 * cross-check / fallback that never fabricates completion.
 */
export function deriveWeightedProgress(events: RuntimeStageEvent[]): number {
  if (TOTAL_STAGE_WEIGHT <= 0) return 0;
  const completedWeight = GENERATION_STAGES.reduce((sum, stage) => {
    const status = deriveStageStatus(events, stage.id);
    if (status === "completed" || status === "skipped") return sum + stage.estimatedWeight;
    return sum;
  }, 0);
  return Math.min(Math.round((completedWeight / TOTAL_STAGE_WEIGHT) * 100), 100);
}

/** Which stage is currently running (first "running" in sequence order). */
export function deriveCurrentStage(events: RuntimeStageEvent[]): GenerationStageId | null {
  for (const stage of GENERATION_STAGES) {
    if (deriveStageStatus(events, stage.id) === "running") return stage.id;
  }
  return null;
}

/** Number of completed/skipped stages. */
export function deriveCompletedCount(events: RuntimeStageEvent[]): number {
  return GENERATION_STAGES.filter((s) => {
    const st = deriveStageStatus(events, s.id);
    return st === "completed" || st === "skipped";
  }).length;
}
