// ── Experience Analytics (Phase 13) ─────────────────────────
// Super Admin view over existing data — experience/theme distribution,
// industry distribution, goal distribution and health averages. No duplicate
// calculations: reads persisted settings + health projections only.

import { prisma } from "@/lib/prisma";
import { healthHistoryStore } from "@/modules/business-health";
import { experienceRegistry } from "@/modules/theme/runtime/experience";

export interface ExperienceAnalyticsReport {
  experiences: Array<{ experience: string; count: number }>;
  industries: Array<{ industry: string; count: number }>;
  goals: Array<{ goal: string; count: number }>;
  health: { tracked: number; average: number };
  byExperienceHealth: Array<{ experience: string; average: number; count: number }>;
}

export async function computeExperienceAnalytics(): Promise<ExperienceAnalyticsReport> {
  const [websites, industries, goalSettings, histories] = await Promise.all([
    prisma.website.findMany({ select: { tenantId: true, themePackageId: true } }),
    prisma.setting.findMany({ where: { key: "influencer_data" }, select: { tenantId: true, value: true } }),
    prisma.setting.findMany({ where: { key: "creator_goals" }, select: { tenantId: true, value: true } }),
    healthHistoryStore.getAll(),
  ]);

  const industryOf = new Map(industries.map((s) => [s.tenantId, (s.value as { niche?: string })?.niche ?? null]));
  const goalOf = new Map(goalSettings.map((s) => [s.tenantId, primaryGoalId(s.value)]));

  const experienceOf = new Map<string, string>();
  for (const w of websites) {
    const resolved = experienceRegistry.resolve({ id: w.themePackageId ?? null });
    experienceOf.set(w.tenantId, resolved?.id ?? w.themePackageId ?? "unknown");
  }

  const experienceCounts = new Map<string, number>();
  const industryCounts = new Map<string, number>();
  const goalCounts = new Map<string, number>();
  for (const w of websites) {
    const exp = experienceOf.get(w.tenantId) ?? "unknown";
    experienceCounts.set(exp, (experienceCounts.get(exp) ?? 0) + 1);

    const industry = industryOf.get(w.tenantId);
    if (industry) industryCounts.set(industry, (industryCounts.get(industry) ?? 0) + 1);

    const goal = goalOf.get(w.tenantId);
    if (goal) goalCounts.set(goal, (goalCounts.get(goal) ?? 0) + 1);
  }

  const latestByTenant = new Map(histories.map((h) => [h.tenantId, h.projections[h.projections.length - 1]]));
  const health = {
    tracked: latestByTenant.size,
    average: latestByTenant.size > 0
      ? Math.round(Array.from(latestByTenant.values()).reduce((sum, p) => sum + (p?.overallScore ?? 0), 0) / latestByTenant.size)
      : 0,
  };

  const byExpHealth = new Map<string, { experience: string; total: number; count: number }>();
  for (const w of websites) {
    const last = latestByTenant.get(w.tenantId);
    if (!last) continue;
    const exp = experienceOf.get(w.tenantId) ?? "unknown";
    const entry = byExpHealth.get(exp) ?? { experience: exp, total: 0, count: 0 };
    entry.total += last.overallScore;
    entry.count += 1;
    byExpHealth.set(exp, entry);
  }

  return {
    experiences: Array.from(experienceCounts.entries()).map(([experience, count]) => ({ experience, count })).sort((a, b) => b.count - a.count),
    industries: Array.from(industryCounts.entries()).map(([industry, count]) => ({ industry, count })).sort((a, b) => b.count - a.count),
    goals: Array.from(goalCounts.entries()).map(([goal, count]) => ({ goal, count })).sort((a, b) => b.count - a.count),
    health,
    byExperienceHealth: Array.from(byExpHealth.values()).map((e) => ({ experience: e.experience, average: Math.round(e.total / e.count), count: e.count })).sort((a, b) => b.average - a.average),
  };
}

function primaryGoalId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const weights = (value as { weights?: Array<{ goalId?: string; weight?: number }> })?.weights;
  if (!Array.isArray(weights) || weights.length === 0) return null;
  return [...weights].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0]?.goalId ?? null;
}
