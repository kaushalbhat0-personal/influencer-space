import { prisma } from "@/lib/prisma";
import { AuditStream } from "./_components/audit-stream";

export const dynamic = "force-dynamic";

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { tenant?: string; action?: string; page?: string };
}) {
  const page = parseInt(searchParams.page || "1");
  const pageSize = 50;
  const tenantFilter = searchParams.tenant;
  const actionFilter = searchParams.action;

  const where: Record<string, unknown> = {};
  if (tenantFilter) where.tenantId = tenantFilter;
  if (actionFilter) where.action = { contains: actionFilter, mode: "insensitive" };

  const [logs, total, tenants] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { tenant: { select: { name: true, subdomain: true } } },
    }),
    prisma.auditLog.count({ where }),
    prisma.tenant.findMany({ select: { id: true, name: true } }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div>
      <h1 className="text-2xl font-bold text-white font-display">Audit Log</h1>
      <p className="mt-1 text-sm text-zinc-400">
        Every mutation across the platform. {total} entries total.
      </p>
      <AuditStream
        logs={logs.map((log) => ({ ...log, createdAt: log.createdAt.toISOString() }))}
        tenants={tenants}
        page={page}
        totalPages={totalPages}
      />
    </div>
  );
}
