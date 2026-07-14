import Link from "next/link";
import { TimelineService } from "@/services/timeline.service";
import { TimelineList } from "./_components/timeline-list";
import { ErrorBoundary } from "@/components/ui/ErrorBoundary";
import { TIMELINE_ROUTE } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  let events: Awaited<ReturnType<typeof TimelineService.findAll>> = [];
  let error: string | null = null;

  try {
    events = await TimelineService.findAll();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load timeline";
  }

  if (error) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">Failed to load timeline</p>
        <p className="mt-1 text-sm text-red-300">{error}</p>
        <p className="mt-2 text-xs text-red-400/60">
          Make sure the database migration has been run.
        </p>
      </div>
    );
  }

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
          className="inline-flex items-center justify-center rounded-lg bg-s8ul-cyan px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-s8ul-cyan/80"
        >
          + New Event
        </Link>
      </div>
      <ErrorBoundary>
        <TimelineList events={events} />
      </ErrorBoundary>
    </div>
  );
}
