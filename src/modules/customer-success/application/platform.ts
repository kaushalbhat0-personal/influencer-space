// ── Customer Success — Platform Center ─────────────────────
// RCCF-EPIC-09 Phase 7 + 10. Bounded, light-derivation aggregation for the
// Super Admin Customer Success Center and agency lists.

import { prisma } from "@/lib/prisma";
import { computeFromSignals } from "./compute";
import { loadSignalsLight } from "./signals";
import type { CustomerSuccess, JourneyStage, RiskLevel } from "../domain/types";

export interface PlatformSuccessCenter {
  total: number;
  funnel: Array<{ stage: JourneyStage; count: number }>;
  scoreBuckets: { low: number; medium: number; high: number };
  healthByScore: { healthy: number; moderate: number; poor: number };
  atRisk: Array<{ tenantId: string; score: number; risk: RiskLevel; reasons: string[] }>;
  needingHelp: Array<{ tenantId: string; score: number; risk: RiskLevel; reasons: string[] }>;
  paymentIncomplete: Array<{ tenantId: string; score: number }>;
  trialEnding: Array<{ tenantId: string; trialEndsAt: string }>;
  inactive: Array<{ tenantId: string; score: number }>;
  topPerformers: Array<{ tenantId: string; score: number; stage: string }>;
}

const HIGH_RISK: RiskLevel[] = ["high", "critical"];
const ANY_RISK: RiskLevel[] = ["medium", "high", "critical"];

/** Compute for a bounded cohort (most recent tenants) — a live snapshot. */
export async function getPlatformSuccessCenter(limit = 250): Promise<PlatformSuccessCenter> {
  const tenants = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  const results: CustomerSuccess[] = [];
  for (const t of tenants) {
    try {
      const signals = await loadSignalsLight(t.id);
      results.push(computeFromSignals(signals));
    } catch {
      // skip tenants whose data is unavailable
    }
  }

  const byStage = new Map<JourneyStage, number>();
  for (const r of results) byStage.set(r.stage, (byStage.get(r.stage) ?? 0) + 1);
  const funnel = Array.from(byStage.entries()).map(([stage, count]) => ({ stage, count }));

  const scoreBuckets = { low: 0, medium: 0, high: 0 };
  const healthByScore = { healthy: 0, moderate: 0, poor: 0 };
  for (const r of results) {
    if (r.score < 40) scoreBuckets.low++;
    else if (r.score < 70) scoreBuckets.medium++;
    else scoreBuckets.high++;
    const h = r.dimensions.website;
    if (h >= 70) healthByScore.healthy++;
    else if (h >= 40) healthByScore.moderate++;
    else healthByScore.poor++;
  }

  const atRisk = results.filter((r) => HIGH_RISK.includes(r.risk)).sort((a, b) => b.score - a.score).slice(0, 50).map(toRow);
  const needingHelp = results.filter((r) => ANY_RISK.includes(r.risk) && !HIGH_RISK.includes(r.risk)).sort((a, b) => b.score - a.score).slice(0, 50).map(toRow);
  const paymentIncomplete = results.filter((r) => r.dimensions.payment < 100).sort((a, b) => b.score - a.score).slice(0, 50).map((r) => ({ tenantId: r.tenantId, score: r.score }));
  const trialEnding = results.filter((r) => r.trialEndsAt && new Date(r.trialEndsAt).getTime() - Date.now() <= 3 * 86400000).map((r) => ({ tenantId: r.tenantId, trialEndsAt: r.trialEndsAt!.toISOString() }));
  const inactive = results.filter((r) => r.riskFindings.some((f) => f.key === "inactive")).sort((a, b) => b.score - a.score).slice(0, 50).map((r) => ({ tenantId: r.tenantId, score: r.score }));
  const topPerformers = [...results].sort((a, b) => b.score - a.score).slice(0, 10).map((r) => ({ tenantId: r.tenantId, score: r.score, stage: r.stage }));

  return { total: results.length, funnel, scoreBuckets, healthByScore, atRisk, needingHelp, paymentIncomplete, trialEnding, inactive, topPerformers };
}

/** Agency list: risk summary for each of the agency's clients. */
export async function getAgencySuccessClients(agencyId: string, limit = 100): Promise<Array<{ tenantId: string; score: number; risk: RiskLevel; reasons: string[] }>> {
  const clients = await prisma.agencyTenant.findMany({
    where: { agencyId },
    take: limit,
    select: { tenantId: true },
  });
  const rows: Array<{ tenantId: string; score: number; risk: RiskLevel; reasons: string[] }> = [];
  for (const c of clients) {
    try {
      const signals = await loadSignalsLight(c.tenantId);
      const r = computeFromSignals(signals);
      rows.push(toRow(r));
    } catch {
      // skip
    }
  }
  return rows;
}

function toRow(r: CustomerSuccess): { tenantId: string; score: number; risk: RiskLevel; reasons: string[] } {
  return { tenantId: r.tenantId, score: r.score, risk: r.risk, reasons: r.riskFindings.map((f) => f.label) };
}
