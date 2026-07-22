import { prisma } from "@/lib/prisma";
import { WebhooksTable } from "./_components/webhooks-table";

export const dynamic = "force-dynamic";

export default async function WebhooksPage() {
  let hooks: { id: string; action: string; metadata: string; createdAt: string; }[] = [];
  try {
    const raw = await prisma.auditLog.findMany({
      where: { action: { startsWith: "webhook:" } },
      orderBy: { createdAt: "desc" }, take: 100,
    });
    hooks = raw.map((a) => ({
      id: a.id, action: a.action,
      metadata: JSON.stringify(a.metadata).slice(0, 80),
      createdAt: a.createdAt.toISOString(),
    }));
  } catch { /* */ }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Webhooks</h1>
        <p className="mt-1 text-sm text-zinc-400">Incoming webhook events from payment gateways. {hooks.length} events recorded.</p>
      </div>
      <WebhooksTable data={hooks} />
    </div>
  );
}
