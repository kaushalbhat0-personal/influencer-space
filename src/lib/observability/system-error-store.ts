import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export type SystemErrorStatus = "NEW" | "ACKNOWLEDGED" | "RESOLVED" | "IGNORED";
export type SystemErrorLevel = "WARN" | "ERROR" | "FATAL";

export interface SystemErrorFilters {
  status?: SystemErrorStatus | "ALL";
  level?: SystemErrorLevel | "ALL";
  service?: string;
  environment?: string;
  tenantId?: string;
  fingerprint?: string;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  pageSize?: number;
}

export async function listSystemErrors(filters: SystemErrorFilters = {}) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const where: Record<string, unknown> = {};

  if (filters.status && filters.status !== "ALL") where.status = filters.status;
  if (filters.level && filters.level !== "ALL") where.level = filters.level;
  if (filters.service && filters.service !== "ALL") where.service = filters.service;
  if (filters.environment && (filters.environment as string) !== "ALL") where.environment = filters.environment;
  if (filters.fingerprint) where.fingerprint = filters.fingerprint;
  if (filters.tenantId) where.tenantIds = { has: filters.tenantId };
  if (filters.from || filters.to) {
    const createdAt: Record<string, unknown> = {};
    if (filters.from) createdAt.gte = filters.from;
    if (filters.to) createdAt.lte = filters.to;
    where.createdAt = createdAt;
  }
  if (filters.search) {
    // Search in message or service/operation/route
    where.OR = [
      { message: { contains: filters.search, mode: "insensitive" } },
      { service: { contains: filters.search, mode: "insensitive" } },
      { operation: { contains: filters.search, mode: "insensitive" } },
      { route: { contains: filters.search, mode: "insensitive" } },
      { fingerprint: { contains: filters.search, mode: "insensitive" } },
      { correlationId: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.systemError.findMany({
      where,
      orderBy: { lastSeen: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.systemError.count({ where }),
  ]);

  return { rows, total, page, pageSize };
}

export async function getSystemError(id: string) {
  return prisma.systemError.findUnique({ where: { id } });
}

export async function setSystemErrorStatus(
  id: string,
  status: SystemErrorStatus,
  actor?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const existing = await prisma.systemError.findUnique({ where: { id } });
    if (!existing) return { success: false, error: "Error not found" };
    await prisma.systemError.update({ where: { id }, data: { status } });
    await logAction("system", `system-error:${status.toLowerCase()}`, {
      errorId: id,
      fingerprint: existing.fingerprint,
      status,
      actor,
    }).catch(() => {});
    return { success: true };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Failed to update" };
  }
}

export async function countByStatus(): Promise<Record<SystemErrorStatus, number>> {
  const rows = await prisma.systemError.groupBy({ by: ["status"], _count: true });
  const out: Record<SystemErrorStatus, number> = { NEW: 0, ACKNOWLEDGED: 0, RESOLVED: 0, IGNORED: 0 };
  for (const r of rows) if (out[r.status as SystemErrorStatus] !== undefined) out[r.status as SystemErrorStatus] = r._count;
  return out;
}

export async function distinctServices(): Promise<string[]> {
  const rows = await prisma.systemError.findMany({ distinct: ["service"], select: { service: true } });
  return rows.map((r) => r.service);
}
