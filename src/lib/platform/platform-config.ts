// ── Platform Config (feature flags) ─────────────────────────
// VALIDATION-04: feature flags stored by super-admin were write-only (no
// runtime consumers). This is the canonical read path; gates live in the
// storefront (maintenance mode) and registration (new registrations).

import { prisma } from "@/lib/prisma";

const PLATFORM_CONFIG_KEY = "platform_config";

export async function getPlatformConfig(): Promise<Record<string, boolean>> {
  try {
    const platformTenant = await prisma.tenant.findFirst({
      select: { id: true },
      orderBy: { createdAt: "asc" },
    });
    if (!platformTenant) return {};
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId: platformTenant.id, key: PLATFORM_CONFIG_KEY } },
      select: { value: true },
    });
    return (setting?.value ?? {}) as Record<string, boolean>;
  } catch {
    return {};
  }
}

export async function isFlagEnabled(key: string): Promise<boolean> {
  const config = await getPlatformConfig();
  return config[key] === true;
}
