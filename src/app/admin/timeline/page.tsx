import Link from "next/link";
import { TimelineService } from "@/services/timeline.service";
import { TimelineList } from "./_components/timeline-list";
import { TIMELINE_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  const events = await TimelineService.findAll();

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Timeline</h1>
          <p className="text-sm text-gray-400">
            Manage career milestones and achievements
          </p>
        </div>
        <Link
          href={`${TIMELINE_ROUTE}/new`}
          className="inline-flex items-center justify-center rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-amber-400"
        >
          + New Event
        </Link>
      </div>
      <TimelineList events={events} />
    </div>
  );
}
