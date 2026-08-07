// ── Recommendation History (Phase 11) ───────────────────────
// Persists per-tenant recommendation history under the
// `recommendation_history` Setting: dismissed / completed / ignored / accepted,
// with shownAt / completedAt / dismissedAt timestamps. Completed entries record
// the scores at completion so Phase 12 analytics can report lifts.

import { prisma } from "@/lib/prisma";
import type { RecommendationHistory as HistoryMap, RecommendationHistoryEntry } from "../domain/types";

export const HISTORY_SETTING_KEY = "recommendation_history" as const;

export class RecommendationHistory {
  async get(tenantId: string): Promise<HistoryMap> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: HISTORY_SETTING_KEY } },
      select: { value: true },
    });
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as unknown as HistoryMap;
    }
    return {};
  }

  private async persist(tenantId: string, history: HistoryMap): Promise<void> {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: HISTORY_SETTING_KEY } },
      create: { tenantId, key: HISTORY_SETTING_KEY, value: history as never },
      update: { value: history as never },
    });
  }

  /** Record first-time impressions for recommendations returned to the user. */
  async markShown(tenantId: string, ids: string[]): Promise<void> {
    const history = await this.get(tenantId);
    let changed = false;
    const now = new Date().toISOString();
    for (const id of ids) {
      const entry = history[id];
      if (!entry) {
        history[id] = { status: "accepted", shownAt: now };
        changed = true;
      } else if (!entry.shownAt) {
        history[id] = { ...entry, status: "accepted", shownAt: now };
        changed = true;
      }
    }
    if (changed) await this.persist(tenantId, history);
  }

  private async setStatus(
    tenantId: string,
    id: string,
    patch: Partial<RecommendationHistoryEntry>,
  ): Promise<void> {
    const history = await this.get(tenantId);
    history[id] = { ...history[id], ...patch };
    await this.persist(tenantId, history);
  }

  async dismiss(tenantId: string, id: string): Promise<void> {
    await this.setStatus(tenantId, id, { status: "dismissed", dismissedAt: new Date().toISOString() });
  }

  async ignore(tenantId: string, id: string): Promise<void> {
    await this.setStatus(tenantId, id, { status: "ignored", ignoredAt: new Date().toISOString() });
  }

  async complete(
    tenantId: string,
    id: string,
    scores: { knowledge: number; goalAlignment: number; storefront: number } | null,
  ): Promise<void> {
    await this.setStatus(tenantId, id, {
      status: "completed",
      completedAt: new Date().toISOString(),
      ...(scores ? { completedScores: scores } : {}),
    });
  }

  /** Refresh surfaces previously ignored recommendations (dismissed stay gone). */
  async clearIgnored(tenantId: string): Promise<void> {
    const history = await this.get(tenantId);
    const next: HistoryMap = {};
    for (const [id, entry] of Object.entries(history)) {
      if (entry.status === "ignored") continue;
      next[id] = entry;
    }
    await this.persist(tenantId, next);
  }

  /** All tenant histories, for Phase 12 admin analytics. */
  async getAll(): Promise<Array<{ tenantId: string; history: HistoryMap }>> {
    const rows = await prisma.setting.findMany({
      where: { key: HISTORY_SETTING_KEY },
      select: { tenantId: true, value: true },
    });
    return rows
      .filter((row) => row.value && typeof row.value === "object")
      .map((row) => ({ tenantId: row.tenantId, history: row.value as unknown as HistoryMap }));
  }
}

export const recommendationHistory = new RecommendationHistory();
