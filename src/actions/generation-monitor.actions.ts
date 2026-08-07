"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getGenerationMonitor } from "@/modules/generation-progress";

export async function getGenerationMonitorData(): Promise<{ ok: boolean; monitor?: Awaited<ReturnType<typeof getGenerationMonitor>>; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user?.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  return { ok: true, monitor: await getGenerationMonitor(50) };
}
