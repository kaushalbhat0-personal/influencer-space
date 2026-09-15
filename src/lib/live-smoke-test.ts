import { prisma } from "@/lib/prisma";
import { SMOKE_TEST_CONFIG_ID } from "@/modules/billing/domain/live-smoke-test";

/**
 * RCCF-LIVE-SMOKE-01 — SUPER_ADMIN-only LIVE smoke test toggle state.
 * Default OFF. Stored as singleton LiveSmokeTestConfig id='live-smoke-test'.
 * Amounts are never client-controlled; this state is the sole server-side authority.
 */

export async function isLiveSmokeTestEnabled(): Promise<boolean> {
  try {
    const row = await prisma.liveSmokeTestConfig.findUnique({
      where: { id: SMOKE_TEST_CONFIG_ID },
      select: { enabled: true },
    });
    return row?.enabled ?? false;
  } catch {
    return false;
  }
}

export async function getLiveSmokeTestConfig(): Promise<{
  enabled: boolean;
  enabledBy: string | null;
  enabledAt: Date | null;
  updatedAt: Date | null;
}> {
  try {
    const row = await prisma.liveSmokeTestConfig.findUnique({
      where: { id: SMOKE_TEST_CONFIG_ID },
    });
    if (!row) return { enabled: false, enabledBy: null, enabledAt: null, updatedAt: null };
    return {
      enabled: row.enabled,
      enabledBy: (row as { enabledBy?: string | null }).enabledBy ?? null,
      enabledAt: (row as { enabledAt?: Date | null }).enabledAt ?? null,
      updatedAt: (row as { updatedAt?: Date | null }).updatedAt ?? null,
    };
  } catch {
    return { enabled: false, enabledBy: null, enabledAt: null, updatedAt: null };
  }
}
