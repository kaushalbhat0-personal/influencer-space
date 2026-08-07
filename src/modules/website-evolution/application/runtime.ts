// ── Website Evolution Runtime (Phase 11) ────────────────────
// Public API: detect / preview / apply / history / versionInfo / platform.
// The runtime NEVER edits websites automatically — it produces evolution
// opportunities the creator previews and approves. Consumes RuntimeContext
// only; never rebuilds the WebsiteAggregate.

import { prisma } from "@/lib/prisma";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import type { RuntimeContext } from "@/modules/runtime-context";
import { recommendationHistory } from "@/modules/recommendation-runtime";
import type { HealthEvalDeps } from "@/modules/business-health";
import { detectOpportunities } from "./detector";
import { evolutionHistoryStore } from "../infrastructure/history-store";
import { websiteVersioning } from "./versioning";
import { getEvolution } from "../domain/registry";
import type {
  ChangePreview,
  EvolutionHistory,
  EvolutionOpportunity,
  EvolutionStatus,
  PlatformEvolutionReport,
  WebsiteVersionInfo,
} from "../domain/types";

export class WebsiteEvolutionRuntime {
  /** Detect growth-triggered evolution opportunities (builds the context once). */
  async detect(tenantId: string): Promise<EvolutionOpportunity[]> {
    const ctx = await runtimeContextBuilder.build(tenantId, { markShown: true });
    return this.detectFrom(ctx, tenantId);
  }

  /** Detect from an already-built context (no second build). */
  async detectFrom(ctx: RuntimeContext, tenantId: string): Promise<EvolutionOpportunity[]> {
    const [history, deps] = await Promise.all([
      evolutionHistoryStore.get(tenantId).catch(() => ({})),
      this.buildHealthDeps(tenantId),
    ]);
    return detectOpportunities(ctx, history, deps);
  }

  private async buildHealthDeps(tenantId: string): Promise<HealthEvalDeps> {
    try {
      const history = await recommendationHistory.get(tenantId);
      return { tenantId, recommendationHistory: history };
    } catch {
      return { tenantId, recommendationHistory: {} };
    }
  }

  /** Preview a change — before/after health, conversion, trust + manifest. */
  async preview(tenantId: string, id: string): Promise<ChangePreview | null> {
    const opportunities = await this.detect(tenantId);
    const opportunity = opportunities.find((o) => o.id === id);
    if (!opportunity) return null;
    return {
      id: opportunity.id,
      title: opportunity.title,
      reason: opportunity.reason,
      before: opportunity.before,
      after: opportunity.after,
      lift: opportunity.expectedLift,
      change: opportunity.change,
    };
  }

  /**
   * Apply an evolution (creator-approved). Validates the opportunity is still
   * live, records the outcome with before/after health, and returns the change
   * manifest for the creator to apply. Never edits the website itself.
   */
  async apply(tenantId: string, id: string): Promise<{ success: boolean; manifest?: ChangePreview["change"]; error?: string }> {
    const opportunities = await this.detect(tenantId);
    const opportunity = opportunities.find((o) => o.id === id);
    if (!opportunity) {
      return { success: false, error: "This opportunity no longer applies." };
    }
    await evolutionHistoryStore.setStatus(tenantId, id, "applied", {
      beforeHealth: opportunity.before.health,
      afterHealth: opportunity.after.health,
    });
    return { success: true, manifest: opportunity.change };
  }

  async setStatus(tenantId: string, id: string, status: EvolutionStatus): Promise<void> {
    await evolutionHistoryStore.setStatus(tenantId, id, status);
  }

  async history(tenantId: string): Promise<EvolutionHistory> {
    return evolutionHistoryStore.get(tenantId).catch(() => ({}));
  }

  async versionInfo(tenantId: string): Promise<WebsiteVersionInfo> {
    return websiteVersioning.info(tenantId);
  }

  getDefinition(id: string) {
    return getEvolution(id);
  }

  /** Super Admin platform evolution (Phase 10) — aggregated history. */
  async platformEvolution(): Promise<PlatformEvolutionReport> {
    const [rows, industries, goals] = await Promise.all([
      evolutionHistoryStore.getAll().catch(() => []),
      prisma.setting.findMany({ where: { key: "influencer_data" }, select: { tenantId: true, value: true } }).catch(() => []),
      prisma.setting.findMany({ where: { key: "creator_goals" }, select: { tenantId: true, value: true } }).catch(() => []),
    ]);

    const industryOf = new Map(industries.map((s) => [s.tenantId, (s.value as { niche?: string })?.niche ?? null]));
    const goalOf = new Map(goals.map((s) => [s.tenantId, primaryGoalId(s.value)]));

    const perId = new Map<string, { id: string; title: string; detected: number; applied: number; rejected: number; deferred: number; healthSum: number; conversionSum: number }>();
    const industryStats = new Map<string, { industry: string; applied: number; healthSum: number }>();
    const goalStats = new Map<string, { goal: string; applied: number; healthSum: number }>();
    let detectedTotal = 0;
    let appliedTotal = 0;

    for (const row of rows) {
      for (const [id, entry] of Object.entries(row.history)) {
        const def = getEvolution(id);
        if (!def) continue;
        detectedTotal += 1;
        const stat = perId.get(id) ?? { id, title: def.title, detected: 0, applied: 0, rejected: 0, deferred: 0, healthSum: 0, conversionSum: 0 };
        stat.detected += 1;
        if (entry.status === "applied") {
          stat.applied += 1; appliedTotal += 1;
          stat.healthSum += def.expectedLift.health;
          stat.conversionSum += def.expectedLift.conversion;
          const industry = industryOf.get(row.tenantId);
          if (industry) {
            const istat = industryStats.get(industry) ?? { industry, applied: 0, healthSum: 0 };
            istat.applied += 1; istat.healthSum += def.expectedLift.health;
            industryStats.set(industry, istat);
          }
          const goal = goalOf.get(row.tenantId);
          if (goal) {
            const gstat = goalStats.get(goal) ?? { goal, applied: 0, healthSum: 0 };
            gstat.applied += 1; gstat.healthSum += def.expectedLift.health;
            goalStats.set(goal, gstat);
          }
        }
        if (entry.status === "rejected") stat.rejected += 1;
        if (entry.status === "deferred") stat.deferred += 1;
        perId.set(id, stat);
      }
    }

    return {
      totals: {
        detected: detectedTotal,
        applied: appliedTotal,
        rejected: Array.from(perId.values()).reduce((s, p) => s + p.rejected, 0),
        deferred: Array.from(perId.values()).reduce((s, p) => s + p.deferred, 0),
      },
      perEvolution: Array.from(perId.values()).map((p) => ({
        id: p.id,
        title: p.title,
        detected: p.detected,
        applied: p.applied,
        rejectionRate: p.detected > 0 ? Math.round((p.rejected / p.detected) * 100) : 0,
        avgHealthLift: p.applied > 0 ? Math.round((p.healthSum / p.applied) * 10) / 10 : 0,
        avgConversionLift: p.applied > 0 ? Math.round((p.conversionSum / p.applied) * 10) / 10 : 0,
      })).sort((a, b) => b.applied - a.applied),
      byIndustry: Array.from(industryStats.values()).map((s) => ({
        industry: s.industry,
        applied: s.applied,
        avgHealthLift: s.applied > 0 ? Math.round((s.healthSum / s.applied) * 10) / 10 : 0,
      })).sort((a, b) => b.applied - a.applied),
      byGoal: Array.from(goalStats.values()).map((s) => ({
        goal: s.goal,
        applied: s.applied,
        avgHealthLift: s.applied > 0 ? Math.round((s.healthSum / s.applied) * 10) / 10 : 0,
      })).sort((a, b) => b.applied - a.applied),
    };
  }
}

function primaryGoalId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const weights = (value as { weights?: Array<{ goalId?: string; weight?: number }> })?.weights;
  if (!Array.isArray(weights) || weights.length === 0) return null;
  return [...weights].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))[0]?.goalId ?? null;
}

export const websiteEvolutionRuntime = new WebsiteEvolutionRuntime();
