// ── Customer Success — Success Score Engine ────────────────
// RCCF-EPIC-09 Phase 1. Nine dimensions, weighted 0-100. Reuses existing
// runtime outputs (knowledge score, health, goals, payment readiness) — no
// duplicate calculations.

import type { SuccessDimensions, SuccessSignals } from "../domain/types";

export interface DimensionDef {
  key: keyof SuccessDimensions;
  weight: number;
  score(s: SuccessSignals): number; // 0-100
}

export const SUCCESS_DIMENSIONS: DimensionDef[] = [
  { key: "activation", weight: 0.1, score: (s) => activationScore(s) },
  { key: "profile", weight: 0.15, score: (s) => s.knowledgeScore ?? 0 },
  { key: "website", weight: 0.15, score: (s) => s.healthScore ?? (s.published ? 60 : 0) },
  { key: "publishing", weight: 0.15, score: (s) => (s.published ? 100 : 0) },
  { key: "payment", weight: 0.1, score: (s) => (s.paymentReady ? 100 : 0) },
  { key: "commerce", weight: 0.15, score: (s) => commerceScore(s) },
  { key: "engagement", weight: 0.1, score: (s) => engagementScore(s) },
  { key: "retention", weight: 0.05, score: (s) => retentionScore(s) },
  { key: "return", weight: 0.05, score: (s) => (s.orderCount >= 5 ? 100 : s.orderCount >= 2 ? 60 : s.orderCount >= 1 ? 30 : 0) },
];

export function computeSuccessScore(s: SuccessSignals): { overall: number; dimensions: SuccessDimensions } {
  const dimensions = {} as SuccessDimensions;
  let total = 0;
  for (const def of SUCCESS_DIMENSIONS) {
    const value = clamp(def.score(s));
    dimensions[def.key] = Math.round(value);
    total += value * def.weight;
  }
  return { overall: Math.round(clamp(total)), dimensions };
}

function activationScore(s: SuccessSignals): number {
  let steps = 1; // signed up
  if (s.knowledgeScore !== null) steps++;
  if (s.healthScore !== null || s.published || s.productCount > 0) steps++;
  if (s.published) steps++;
  return Math.min(100, (steps / 4) * 100);
}

function commerceScore(s: SuccessSignals): number {
  let score = 0;
  if (s.hasProducts) score += 40;
  if (s.galleryCount > 0) score += 10;
  if (s.hasOrders) score += 30;
  if (s.orderCount >= 5) score += 20;
  return Math.min(100, score);
}

function engagementScore(s: SuccessSignals): number {
  const goal = s.goalAlignment ?? 0;
  const rec = Math.min(100, s.completedRecommendations * 20);
  return Math.round((goal * 0.6 + rec * 0.4));
}

function retentionScore(s: SuccessSignals): number {
  const ageDays = (Date.now() - s.createdAt.getTime()) / 86400000;
  const activity = s.lastActivityAt ? (Date.now() - s.lastActivityAt.getTime()) / 86400000 : 999;
  if (activity <= 7) return 100;
  if (activity <= 14) return 70;
  if (activity <= 30) return 40;
  if (ageDays < 7) return 50;
  return 10;
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}
