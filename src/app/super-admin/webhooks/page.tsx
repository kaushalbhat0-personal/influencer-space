import { prisma } from "@/lib/prisma";
import { DataTable } from "@/components/data/DataTable";
import type { Column } from "@/components/data/DataTable";

export const dynamic = "force-dynamic";

interface WebhookRow { id: string; action: string; metadata: string; createdAt: Date; }

export default async function WebhooksPage() {
  let hooks: WebhookRow[] = [];
  try {
    const raw = await prisma.auditLog.findMany({
      where: { action: { startsWith: "webhook:" } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    hooks = raw.map((a) => ({
      id: a.id, action: a.action,
      metadata: JSON.stringify(a.metadata).slice(0, 80),
      createdAt: a.createdAt,
    }));
  } catch { /* */ }

  const cols: Column<WebhookRow>[] = [
    { key: "action", header: "Event", sortable: true, cell: (r) => <span className="text-indigo-400 text-sm font-medium">{r.action}</span> },
    { key: "metadata", header: "Details", cell: (r) => <span className="text-zinc-500 text-xs font-mono">{r.metadata}...</span> },
    { key: "createdAt", header: "Received", sortable: true, cell: (r) => <span className="text-zinc-500 text-xs">{new Date(r.createdAt).toLocaleDateString("en-IN")} {new Date(r.createdAt).toLocaleTimeString("en-IN")}</span> },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Webhooks</h1>
        <p className="mt-1 text-sm text-zinc-400">Incoming webhook events from payment gateways. {hooks.length} events recorded.</p>
      </div>
      <DataTable columns={cols} data={hooks} pageSize={25} emptyMessage="No webhook events recorded." />
    </div>
  );
}
