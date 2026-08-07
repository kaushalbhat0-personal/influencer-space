// ── Business Health Runtime (Phase 16) ──────────────────────
// Canonical public API. Composes the Runtime Context into a single Business
// Health Score. Owns no business data — it is a derived projection.
//
//   evaluate()  — live score + trend (no writes)
//   record()    — append an immutable projection when due
//   getHistory()/getTrend()/compare() — projections + comparison
//   platformHealth() — Super Admin platform-wide view

import { prisma } from "@/lib/prisma";
import { runtimeContextBuilder } from "@/modules/runtime-context";
import type { RuntimeContext } from "@/modules/runtime-context";
import { recommendationHistory } from "@/modules/recommendation-runtime";
import { listAllSubscriptions } from "@/modules/billing/application/plan-source";
import { emitEvent } from "@/modules/event-runtime";
import { computeBusinessHealth, toProjection, type BusinessHealthOptions } from "./engine";
import { trendFrom } from "./trend";
import { healthHistoryStore } from "../infrastructure/history-store";
import { HEALTH_DIMENSION_REGISTRY, type HealthEvalDeps } from "../domain/registry";
import { gradeFor } from "./grades";
import type {
  BusinessHealth,
  HealthHistory,
  HealthTrendResult,
  PlatformHealthReport,
  PlatformHealthSnapshot,
} from "../domain/types";

export interface HealthEvaluation {
  health: BusinessHealth;
  trend: HealthTrendResult;
  history: HealthHistory;
}

function buildDeps(tenantId: string): Promise<HealthEvalDeps> {
  return recommendationHistory.get(tenantId).then((history) => ({ tenantId, recommendationHistory: history }));
}

export class BusinessHealthRuntime {
  /** Live health from the shared Runtime Context. No writes. */
  async evaluate(tenantId: string, options: { markShown?: boolean; weights?: BusinessHealthOptions["weights"] } = {}): Promise<HealthEvaluation> {
    const ctx = await runtimeContextBuilder.build(tenantId, { markShown: options.markShown ?? true });
    return this.evaluateFrom(ctx, tenantId, options.weights);
  }

  /** Evaluate from an already-built context (no rebuild). */
  async evaluateFrom(ctx: RuntimeContext, tenantId: string, weights?: BusinessHealthOptions["weights"]): Promise<HealthEvaluation> {
    let deps: HealthEvalDeps;
    try {
      deps = await buildDeps(tenantId);
    } catch {
      deps = { tenantId, recommendationHistory: {} };
    }
    const health = computeBusinessHealth(ctx, deps, { weights });

    let history: HealthHistory;
    try {
      history = await healthHistoryStore.get(tenantId);
    } catch {
      history = { tenantId, projections: [] };
    }
    const latest = history.projections[history.projections.length - 1] ?? null;
    const trend = trendFrom(health.overallScore, latest?.overallScore ?? null, history.projections.length);
    return { health, trend, history };
  }

  /**
   * Record an immutable projection when due: no prior projection, a new day, or
   * a significant (±10) change. Returns the updated evaluation.
   */
  async record(tenantId: string): Promise<HealthEvaluation> {
    const ctx = await runtimeContextBuilder.build(tenantId, { markShown: true });
    return this.recordFrom(ctx, tenantId);
  }

  /** Record from an already-built context (no second snapshot build). */
  async recordFrom(ctx: RuntimeContext, tenantId: string): Promise<HealthEvaluation> {
    const evaluation = await this.evaluateFrom(ctx, tenantId);
    const last = evaluation.history.projections[evaluation.history.projections.length - 1] ?? null;

    const now = new Date();
    const sameDay = last && new Date(last.recordedAt).toDateString() === now.toDateString();
    const significant = last && Math.abs(evaluation.health.overallScore - last.overallScore) >= 10;

    if (!last || !sameDay || significant) {
      const projection = toProjection(evaluation.health);
      await healthHistoryStore.append(tenantId, projection);
      await this.emitHealthEvents(tenantId, projection, last?.grade ?? null);
      evaluation.history = await healthHistoryStore.get(tenantId);
      evaluation.trend = trendFrom(evaluation.health.overallScore, last?.overallScore ?? null, evaluation.history.projections.length);
    }

    return evaluation;
  }

  async getHistory(tenantId: string): Promise<HealthHistory> {
    return healthHistoryStore.get(tenantId);
  }

  async getTrend(tenantId: string): Promise<HealthTrendResult> {
    const history = await healthHistoryStore.get(tenantId);
    const latest = history.projections[history.projections.length - 1] ?? null;
    return trendFrom(latest?.overallScore ?? 0, history.projections.length > 1 ? history.projections[history.projections.length - 2]!.overallScore : null, history.projections.length);
  }

  async compare(tenantIdA: string, tenantIdB: string): Promise<{
    a: HealthEvaluation; b: HealthEvaluation;
  }> {
    const [a, b] = await Promise.all([
      this.evaluate(tenantIdA, { markShown: false }),
      this.evaluate(tenantIdB, { markShown: false }),
    ]);
    return { a, b };
  }

  /** Platform-wide health view (Phase 13) — reads immutable projections only. */
  async platformHealth(): Promise<PlatformHealthReport> {
    const [histories, tenants, subscriptions] = await Promise.all([
      healthHistoryStore.getAll(),
      prisma.tenant.findMany({ select: { id: true, name: true } }),
      listAllSubscriptions().catch(() => []),
    ]);

    const tenantName = new Map(tenants.map((t) => [t.id, t.name]));
    const planByTenant = new Map(subscriptions.map((s) => [s.tenantId, s.planDisplay]));

    const industryByTenant = new Map<string, string>();
    const industryRows = await prisma.setting.findMany({
      where: { key: "influencer_data" },
      select: { tenantId: true, value: true },
    });
    for (const row of industryRows) {
      const niche = (row.value as { niche?: string } | null)?.niche;
      if (niche) industryByTenant.set(row.tenantId, niche);
    }

    const snapshots: PlatformHealthSnapshot[] = [];
    for (const history of histories) {
      const last = history.projections[history.projections.length - 1];
      if (!last) continue;
      snapshots.push({
        tenantId: history.tenantId,
        name: tenantName.get(history.tenantId) ?? "Unknown",
        overallScore: last.overallScore,
        grade: last.grade,
        recordedAt: last.recordedAt,
        plan: planByTenant.get(history.tenantId) ?? null,
        industry: industryByTenant.get(history.tenantId) ?? null,
      });
    }

    const average = snapshots.length > 0
      ? Math.round(snapshots.reduce((sum, s) => sum + s.overallScore, 0) / snapshots.length)
      : 0;

    const distribution = Array.from(new Set(snapshots.map((s) => s.grade))).sort().map((grade) => ({
      grade,
      count: snapshots.filter((s) => s.grade === grade).length,
    }));

    const byPlan = new Map<string, { plan: string; total: number; count: number }>();
    const byIndustry = new Map<string, { industry: string; total: number; count: number }>();
    for (const s of snapshots) {
      if (s.plan) {
        const entry = byPlan.get(s.plan) ?? { plan: s.plan, total: 0, count: 0 };
        entry.total += s.overallScore; entry.count += 1;
        byPlan.set(s.plan, entry);
      }
      if (s.industry) {
        const entry = byIndustry.get(s.industry) ?? { industry: s.industry, total: 0, count: 0 };
        entry.total += s.overallScore; entry.count += 1;
        byIndustry.set(s.industry, entry);
      }
    }

    const dimensionAverages = HEALTH_DIMENSION_REGISTRY.map((def) => {
      const scores = histories
        .map((h) => h.projections[h.projections.length - 1])
        .filter((p): p is NonNullable<typeof p> => !!p)
        .map((p) => p.dimensions.find((d) => d.id === def.id)?.score ?? 0);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
      return { id: def.id, label: def.label, average: avg };
    });

    const fastestImprovers = histories
      .filter((h) => h.projections.length >= 2)
      .map((h) => {
        const last = h.projections[h.projections.length - 1]!;
        const prev = h.projections[h.projections.length - 2]!;
        const delta = last.overallScore - prev.overallScore;
        return {
          tenantId: h.tenantId,
          name: tenantName.get(h.tenantId) ?? "Unknown",
          overallScore: last.overallScore,
          grade: last.grade,
          recordedAt: last.recordedAt,
          plan: planByTenant.get(h.tenantId) ?? null,
          industry: industryByTenant.get(h.tenantId) ?? null,
          delta,
        };
      })
      .sort((a, b) => b.delta - a.delta)
      .slice(0, 10);

    const sorted = [...snapshots].sort((a, b) => b.overallScore - a.overallScore);

    return {
      creators: snapshots.length,
      average,
      distribution,
      topTen: sorted.slice(0, 10),
      lowestTen: sorted.slice(-10).reverse(),
      fastestImprovers,
      dimensionAverages,
      byPlan: Array.from(byPlan.values()).map((e) => ({ plan: e.plan, average: Math.round(e.total / e.count), count: e.count })),
      byIndustry: Array.from(byIndustry.values()).map((e) => ({ industry: e.industry, average: Math.round(e.total / e.count), count: e.count })),
    };
  }

  private async emitHealthEvents(tenantId: string, projection: ReturnType<typeof toProjection>, previousGrade: string | null): Promise<void> {
    await emitEvent("business-health.updated", tenantId, undefined, { overallScore: projection.overallScore, grade: projection.grade });
    if (previousGrade && previousGrade !== projection.grade) {
      await emitEvent("business-health.grade.changed", tenantId, undefined, { from: previousGrade, to: projection.grade });
    }
  }

  gradeFor(score: number) {
    return gradeFor(score);
  }
}

export const businessHealthRuntime = new BusinessHealthRuntime();
