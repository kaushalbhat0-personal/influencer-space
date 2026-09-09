"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { listSystemErrors, getSystemError, setSystemErrorStatus, countByStatus } from "@/lib/observability/system-error-store";
import type { SystemErrorStatus } from "@/lib/observability/system-error-store";

async function requireSuperAdmin(): Promise<{ ok: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return { ok: false, error: "Unauthorized" };
  return { ok: true };
}

export async function listErrors(input: {
  status?: string;
  level?: string;
  service?: string;
  environment?: string;
  tenantId?: string;
  search?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  try {
    const result = await listSystemErrors({
      status: (input.status as never) ?? "ALL",
      level: (input.level as never) ?? "ALL",
      service: input.service,
      environment: (input.environment as never) ?? "ALL",
      tenantId: input.tenantId || undefined,
      search: input.search || undefined,
      from: input.from ? new Date(input.from) : undefined,
      to: input.to ? new Date(input.to) : undefined,
      page: input.page ?? 1,
      pageSize: input.pageSize ?? 50,
    });
    return { success: true as const, ...result };
  } catch (e) {
    return { success: false as const, error: e instanceof Error ? e.message : "Failed to list" };
  }
}

export async function getError(id: string) {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  const row = await getSystemError(id);
  if (!row) return { success: false as const, error: "Not found" };
  return { success: true as const, row };
}

export async function updateErrorStatus(id: string, status: SystemErrorStatus) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "SUPER_ADMIN") return { success: false as const, error: "Unauthorized" };
  const actor = session.user.email ?? session.user.id;
  return setSystemErrorStatus(id, status, actor);
}

export async function getErrorCounts() {
  const auth = await requireSuperAdmin();
  if (!auth.ok) return { success: false as const, error: auth.error };
  const counts = await countByStatus();
  return { success: true as const, counts };
}
