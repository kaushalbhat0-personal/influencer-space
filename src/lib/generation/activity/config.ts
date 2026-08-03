/**
 * AI Activity Feed Model — IMPLEMENTATION-30.
 *
 * Configuration-driven activity definitions. ALL activity mappings live here —
 * never scattered across components. Each activity is gated by a REAL
 * generation stage (dependsOnStage); status is derived from the runtime, never
 * invented. Categories are reusable across any future long-running workflow.
 */
import type { GenerationStageId } from "@/lib/generation/experience/stages";

export type ActivityCategoryId =
  | "preparation"
  | "import"
  | "analysis"
  | "generation"
  | "optimization"
  | "validation"
  | "publishing"
  | "completion";

export interface ActivityCategory {
  id: ActivityCategoryId;
  label: string;
  /** Lucide icon key (data, not a component) so the config stays serializable. */
  icon: string;
}

/** Reusable categories — future workflows consume these without new mappings. */
export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  { id: "preparation", label: "Preparation", icon: "Settings2" },
  { id: "import", label: "Import", icon: "Download" },
  { id: "analysis", label: "Analysis", icon: "Brain" },
  { id: "generation", label: "Generation", icon: "Sparkles" },
  { id: "optimization", label: "Optimization", icon: "Image" },
  { id: "validation", label: "Validation", icon: "BadgeCheck" },
  { id: "publishing", label: "Publishing", icon: "Rocket" },
  { id: "completion", label: "Completion", icon: "CheckCircle2" },
];

export type ActivityStatus = "pending" | "running" | "completed" | "skipped" | "failed" | "cancelled";

export type ActivitySeverity = "info" | "success" | "warning" | "error";

/** Metadata the runtime may attach ONLY from real snapshot/aggregate data. */
export type ActivityMetadataKind = "theme" | "heroMedia" | "sections";

export interface ActivityDefinition {
  id: string;
  title: string;
  description: string;
  /** Real generation stage that gates this activity (null = base/terminal). */
  dependsOnStage: GenerationStageId | null;
  category: ActivityCategoryId;
  severity?: ActivitySeverity;
  /** Optional real runtime data the runtime attaches when available. */
  metadataKind?: ActivityMetadataKind;
  /** Terminal activity (e.g. "Storefront ready") — completes with the workflow. */
  terminal?: boolean;
}

/**
 * The canonical activity sequence (config order IS the chronological timeline).
 * Stage activities map 1:1 to real GENERATION_STAGES; milestone activities
 * attach real runtime metadata (theme, hero media, section counts).
 */
export const ACTIVITY_DEFINITIONS: ActivityDefinition[] = [
  {
    id: "preparing_workspace",
    title: "Preparing workspace",
    description: "Setting up the generation environment",
    dependsOnStage: null,
    category: "preparation",
  },
  {
    id: "import_profile",
    title: "Importing creator profile",
    description: "Fetching profile and public details",
    dependsOnStage: "import_profile",
    category: "import",
  },
  {
    id: "knowledge_intelligence",
    title: "Building knowledge graph",
    description: "Mapping content, audience and brand signals",
    dependsOnStage: "knowledge_intelligence",
    category: "analysis",
  },
  {
    id: "persona_detection",
    title: "Detecting persona",
    description: "Understanding voice and positioning",
    dependsOnStage: "persona_detection",
    category: "analysis",
  },
  {
    id: "planning_context",
    title: "Planning experience",
    description: "Structuring the storefront experience",
    dependsOnStage: "planning_context",
    category: "generation",
  },
  {
    id: "planning_content",
    title: "Planning content",
    description: "Deciding pages, sections and content strategy",
    dependsOnStage: "experience_planning",
    category: "generation",
  },
  {
    id: "hero_composition",
    title: "Composing hero",
    description: "Assembling the hero section",
    dependsOnStage: "composition",
    category: "generation",
    metadataKind: "heroMedia",
  },
  {
    id: "theme_applied",
    title: "Applying theme",
    description: "Applying colors and typography",
    dependsOnStage: "composition",
    category: "generation",
    metadataKind: "theme",
  },
  {
    id: "sections_generation",
    title: "Generating sections",
    description: "Writing products, services and content",
    dependsOnStage: "artifact_generation",
    category: "generation",
    metadataKind: "sections",
  },
  {
    id: "workspace_provision",
    title: "Provisioning workspace",
    description: "Creating the storefront workspace",
    dependsOnStage: "provisioning",
    category: "preparation",
  },
  {
    id: "publishing",
    title: "Publishing storefront",
    description: "Publishing your live site",
    dependsOnStage: "publishing",
    category: "publishing",
  },
  {
    id: "validation",
    title: "Validating storefront",
    description: "Running quality checks",
    dependsOnStage: "golden_validation",
    category: "validation",
  },
  {
    id: "storefront_ready",
    title: "Storefront ready",
    description: "Your storefront is live",
    dependsOnStage: null,
    category: "completion",
    terminal: true,
  },
];
