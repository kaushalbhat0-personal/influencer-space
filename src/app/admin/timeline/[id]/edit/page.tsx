import { notFound } from "next/navigation";
import { TimelineService } from "@/services/timeline.service";
import { TimelineForm } from "../../_components/timeline-form";

export default async function EditTimelinePage({
  params,
}: {
  params: { id: string };
}) {
  const event = await TimelineService.findById(params.id);
  if (!event) notFound();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Edit Timeline Event</h1>
      <div className="max-w-lg">
        <TimelineForm mode="edit" event={event} />
      </div>
    </div>
  );
}
