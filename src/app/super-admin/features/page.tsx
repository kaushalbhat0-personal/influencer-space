import { prisma } from "@/lib/prisma";
import { FeatureFlagsClient } from "./_components/feature-flags-client";

export const dynamic = "force-dynamic";

const DEFAULT_FLAGS: Record<string, boolean> = {
  enableYouTubeSync: true,
  enableInstagramSync: true,
  enableTwitchSync: true,
  enableNewRegistrations: true,
  maintenanceMode: false,
};

export default async function FeatureFlagsPage() {
  const platformTenant = await prisma.tenant.findFirst({ select: { id: true }, orderBy: { createdAt: "asc" } });
  const tenantId = platformTenant?.id || "";

  let flags = DEFAULT_FLAGS;
  if (tenantId) {
    const raw = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: "platform_config" } },
    });
    if (raw?.value) {
      flags = { ...DEFAULT_FLAGS, ...(raw.value as Record<string, boolean>) };
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Feature Flags</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Toggle platform-wide features. Changes take effect immediately.
      </p>
      <FeatureFlagsClient flags={flags} />
    </div>
  );
}
