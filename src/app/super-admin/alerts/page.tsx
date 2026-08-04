import { alertStore } from "@/modules/operations/application/alert-store";
import { AlertsClient } from "./_components/alerts-client";

export const dynamic = "force-dynamic";

/** IMPLEMENTATION-40: persisted Alert Center (AlertRecord). No fake alerts. */
export default async function AlertsPage() {
  const [data, counts] = await Promise.all([
    alertStore.list({ page: 1, pageSize: 100 }),
    alertStore.countByStatus(),
  ]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white font-display">Alert Center</h1>
          <p className="mt-1 text-sm text-zinc-400">
            Persisted alerts derived from real runtime conditions (health, billing, jobs).
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-500">
          <span data-testid="alerts-active">{counts.ACTIVE} active</span>
          <span>{counts.RESOLVED} resolved</span>
          <span>{counts.DISMISSED} dismissed</span>
        </div>
      </div>

      <AlertsClient initial={data} />
    </div>
  );
}
