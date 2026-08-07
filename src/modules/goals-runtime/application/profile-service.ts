// ── Goal Profile (Phase 2) ──────────────────────────────────
// Every workspace has a canonical, weighted goal profile stored in the
// `creator_goals` Setting. No duplicate configuration: the profile is the
// single source of truth consumed by composition, navigation, dashboard,
// builder hints, milestones and alignment.

import { prisma } from "@/lib/prisma";
import type { GoalProfile, GoalWeight } from "../domain/types";
import { isKnownGoal } from "../domain/registry";
import { sortWeightsDesc } from "./weights";

export { sortWeightsDesc, primaryGoal } from "./weights";

export const GOALS_SETTING_KEY = "creator_goals" as const;

export interface SaveGoalProfileInput {
  weights: GoalWeight[];
  source: "recommended" | "manual";
}

export interface ProfileValidation {
  valid: boolean;
  errors: string[];
}

/** Validate a weighted profile before persisting it. */
export function validateGoalProfile(input: SaveGoalProfileInput): ProfileValidation {
  const errors: string[] = [];

  if (!Array.isArray(input.weights) || input.weights.length === 0) {
    errors.push("Select at least one goal.");
    return { valid: false, errors };
  }

  const seen = new Set<string>();
  let total = 0;
  for (const w of input.weights) {
    if (!isKnownGoal(w.goalId)) errors.push(`Unknown goal "${w.goalId}".`);
    if (seen.has(w.goalId)) errors.push(`Duplicate goal "${w.goalId}".`);
    seen.add(w.goalId);
    if (!Number.isInteger(w.weight) || w.weight < 0 || w.weight > 100) {
      errors.push(`Goal "${w.goalId}" weight must be an integer between 0 and 100.`);
    }
    total += w.weight;
  }
  if (total > 100) errors.push("Goal weights must sum to 100 or less.");
  if (total === 0) errors.push("Goal weights must be greater than zero.");

  return { valid: errors.length === 0, errors };
}

export class GoalProfileService {
  async getProfile(tenantId: string): Promise<GoalProfile | null> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: GOALS_SETTING_KEY } },
      select: { value: true },
    });
    const value = (setting?.value ?? null) as GoalProfile | null;
    if (!value || !Array.isArray(value.weights)) return null;
    return value;
  }

  async saveProfile(tenantId: string, input: SaveGoalProfileInput): Promise<GoalProfile> {
    const validation = validateGoalProfile(input);
    if (!validation.valid) throw new Error(validation.errors.join(" "));

    const entityType = await this.resolveEntityType(tenantId);
    const profile: GoalProfile = {
      weights: sortWeightsDesc(input.weights),
      updatedAt: new Date().toISOString(),
      source: input.source,
      entityType,
    };

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: GOALS_SETTING_KEY } },
      create: { tenantId, key: GOALS_SETTING_KEY, value: profile as never },
      update: { value: profile as never },
    });

    return profile;
  }

  async clearProfile(tenantId: string): Promise<void> {
    await prisma.setting.deleteMany({
      where: { tenantId, key: GOALS_SETTING_KEY },
    });
  }

  private async resolveEntityType(tenantId: string): Promise<string> {
    const record = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "influencer_data" } },
      select: { value: true },
    });
    const niche = (record?.value as { niche?: string } | null)?.niche ?? "";
    return niche;
  }
}

export const goalProfileService = new GoalProfileService();
