// ── Website Evolution Runtime — Domain Types ────────────────
// RCCF-EPIC-09. Generated websites continuously EVOLVE based on creator
// growth. The runtime NEVER edits websites automatically — it produces
// evolution opportunities the creator can preview, accept, reject or defer.
// Consumes the Runtime Context only.

import type { RuntimeContext } from "@/modules/runtime-context";
import type { GoalId } from "@/modules/goals-runtime";

export type { GoalId } from "@/modules/goals-runtime";

export type EvolutionStatus = "detected" | "accepted" | "rejected" | "ignored" | "deferred" | "applied";

export interface EvolutionLift {
  health: number;
  conversion: number;
  knowledge: number;
  trust: number;
  goalAlignment: number;
}

export interface EvolutionChangeManifest {
  summary: string;
  /** Proposed homepage section order (when the change reorders). */
  sectionOrder?: string[];
  /** Proposed CTA. */
  cta?: { primary: string; secondary: string | null };
  /** A config toggle (e.g. gallery layout → masonry). */
  config?: { base: string; key: string; value: unknown };
  /** Where the creator applies this change. */
  href: string;
}

export interface EvolutionDefinition {
  id: string;
  title: string;
  reason: string;
  expectedLift: EvolutionLift;
  /** Estimated effort in minutes. */
  estimatedEffort: number;
  applicableGoals: GoalId[];
  requiredKnowledge: string[];
  requiredCommerce: string[];
  requiredTrust: string[];
  change: EvolutionChangeManifest;
  /** Growth-triggered predicate (products > 10, gallery > 30, …). */
  when: (ctx: RuntimeContext) => boolean;
}

export interface EvolutionBeforeAfter {
  health: number;
  conversion: number;
  trust: number;
}

export interface EvolutionOpportunity {
  id: string;
  title: string;
  reason: string;
  expectedLift: EvolutionLift;
  estimatedEffort: number;
  applicableGoals: GoalId[];
  change: EvolutionChangeManifest;
  before: EvolutionBeforeAfter;
  after: EvolutionBeforeAfter;
  /** ROI = expected health lift per minute of effort (ordering). */
  roi: number;
  status: EvolutionStatus;
}

export interface ChangePreview {
  id: string;
  title: string;
  reason: string;
  before: EvolutionBeforeAfter;
  after: EvolutionBeforeAfter;
  lift: EvolutionLift;
  change: EvolutionChangeManifest;
}

export interface EvolutionHistoryEntry {
  status: EvolutionStatus;
  detectedAt: string;
  appliedAt?: string;
  resolvedAt?: string;
  beforeHealth?: number;
  afterHealth?: number;
}

export type EvolutionHistory = Record<string, EvolutionHistoryEntry>;

export interface WebsiteVersionInfo {
  currentVersion: number | null;
  previousVersion: number | null;
  generatedVersion: number | null;
  builderVersion: number | null;
  blueprint: string | null;
  experience: string | null;
  publishedAt: string | null;
  evolutionHistoryLength: number;
}

export interface PlatformEvolutionReport {
  totals: { detected: number; applied: number; rejected: number; deferred: number };
  perEvolution: Array<{ id: string; title: string; detected: number; applied: number; rejectionRate: number; avgHealthLift: number; avgConversionLift: number }>;
  byIndustry: Array<{ industry: string; applied: number; avgHealthLift: number }>;
  byGoal: Array<{ goal: string; applied: number; avgHealthLift: number }>;
}
