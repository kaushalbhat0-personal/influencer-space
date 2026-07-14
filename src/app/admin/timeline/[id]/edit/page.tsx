import { notFound } from "next/navigation";
import { TimelineService } from "@/services/timeline.service";
import { TimelineForm } from "../../_components/timeline-form";
import { getTenantContext } from "@/lib/tenant";

export default async function EditTimelinePage({
  params,
}: {
  params: { id: string };
}) {
  const tenant = await getTenantContext();
  if (!tenant) notFound();

  let event;
  try {
    event = await TimelineService.findById(params.id, tenant.id);
  } catch {
    notFound();
  }
  if (!event) notFound();

  return (
    <div>
      <h1 className="admin-gradient-text mb-6 text-2xl font-bold font-gaming">Edit Timeline Event</h1>
      <div className="max-w-2xl">
        <TimelineForm mode="edit" event={event} />
      </div>
    </div>
  );
}
