// ── Evolution History (Phase 9) ─────────────────────────────
// Persists accepted / rejected / ignored / deferred / applied outcomes with
// before/after health so the platform can report actual outcomes.

import { prisma } from "@/lib/prisma";
import type { EvolutionHistory as HistoryMap, EvolutionHistoryEntry, EvolutionStatus } from "../domain/types";

export const EVOLUTION_HISTORY_SETTING_KEY = "evolution_history" as const;

export class EvolutionHistoryStore {
  async get(tenantId: string): Promise<HistoryMap> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: EVOLUTION_HISTORY_SETTING_KEY } },
      select: { value: true },
    }).catch(() => null);
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as unknown as HistoryMap;
    }
    return {};
  }

  private async persist(tenantId: string, history: HistoryMap): Promise<void> {
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: EVOLUTION_HISTORY_SETTING_KEY } },
      create: { tenantId, key: EVOLUTION_HISTORY_SETTING_KEY, value: history as never },
      update: { value: history as never },
    }).catch(() => {});
  }

  async setStatus(
    tenantId: string,
    id: string,
    status: EvolutionStatus,
    extra: Partial<EvolutionHistoryEntry> = {},
  ): Promise<void> {
    const history = await this.get(tenantId);
    const existing = history[id] ?? { status: "detected", detectedAt: new Date().toISOString() };
    const next: EvolutionHistoryEntry = {
      ...existing,
      status,
      ...(status === "applied" ? { appliedAt: new Date().toISOString() } : {}),
      ...(status !== "detected" && status !== "applied" ? { resolvedAt: new Date().toISOString() } : {}),
      ...extra,
    };
    history[id] = next;
    await this.persist(tenantId, history);
  }

  /** All tenant histories — for Super Admin platform evolution. */
  async getAll(): Promise<Array<{ tenantId: string; history: HistoryMap }>> {
    const rows = await prisma.setting.findMany({
      where: { key: EVOLUTION_HISTORY_SETTING_KEY },
      select: { tenantId: true, value: true },
    }).catch(() => []);
    return rows
      .filter((row) => row.value && typeof row.value === "object")
      .map((row) => ({ tenantId: row.tenantId, history: row.value as unknown as HistoryMap }));
  }
}

export const evolutionHistoryStore = new EvolutionHistoryStore();
