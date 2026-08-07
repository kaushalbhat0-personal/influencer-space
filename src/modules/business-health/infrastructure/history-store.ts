// ── Health Projection Store (Phase 5) ───────────────────────
// Stores IMMUTABLE health projections for trends. Per the architectural
// enhancement, Business Health is a derived projection: the live score comes
// from the engine; history is an append-only list of projections (daily or on
// significant changes) — never mutable state. Underlying runtimes remain the
// canonical sources.

import { prisma } from "@/lib/prisma";
import type { HealthHistory, HealthProjection } from "../domain/types";

export const HEALTH_HISTORY_SETTING_KEY = "health_history" as const;

export class HealthHistoryStore {
  async get(tenantId: string): Promise<HealthHistory> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: HEALTH_HISTORY_SETTING_KEY } },
      select: { value: true },
    });
    const value = setting?.value;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      return value as unknown as HealthHistory;
    }
    return { tenantId, projections: [] };
  }

  /** Append an immutable projection. Returns the updated history. */
  async append(tenantId: string, projection: HealthProjection): Promise<HealthHistory> {
    const history = await this.get(tenantId);
    const next: HealthHistory = {
      tenantId,
      projections: [...history.projections, projection].slice(-730), // ~2 years of daily points
    };
    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId, key: HEALTH_HISTORY_SETTING_KEY } },
      create: { tenantId, key: HEALTH_HISTORY_SETTING_KEY, value: next as never },
      update: { value: next as never },
    });
    return next;
  }

  /** Latest projection for a tenant (for trend comparison). */
  async latest(tenantId: string): Promise<HealthProjection | null> {
    const history = await this.get(tenantId);
    return history.projections.length > 0 ? history.projections[history.projections.length - 1]! : null;
  }

  /** All tenant histories — for platform-wide Super Admin views. */
  async getAll(): Promise<HealthHistory[]> {
    const rows = await prisma.setting.findMany({
      where: { key: HEALTH_HISTORY_SETTING_KEY },
      select: { tenantId: true, value: true },
    });
    return rows
      .filter((row) => row.value && typeof row.value === "object")
      .map((row) => row.value as unknown as HealthHistory)
      .filter((h) => Array.isArray(h.projections));
  }
}

export const healthHistoryStore = new HealthHistoryStore();
