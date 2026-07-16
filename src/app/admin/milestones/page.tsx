import { getTenantContext } from "@/lib/tenant";
import { fetchMilestones } from "@/actions/milestone.actions";
import { MilestonesManager } from "./_components/milestones-manager";
import type { MilestoneData } from "@/actions/milestone.actions";

export const dynamic = "force-dynamic";

export default async function AdminMilestonesPage() {
  const tenant = await getTenantContext();
  if (!tenant) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  const result = await fetchMilestones(tenant.id);
  const milestones: MilestoneData[] =
    result.success && result.data ? result.data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Milestones</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage career milestones and achievements.
        </p>
      </div>
      <MilestonesManager tenantId={tenant.id} initialMilestones={milestones} />
    </div>
  );
}
