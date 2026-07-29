import { EmptyState } from "@/components/ui/EmptyState";
import { Timer } from "lucide-react";

export default function JobsPlaceholder() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Background Jobs</h1>
        <p className="mt-1 text-sm text-zinc-400">Cron job monitoring and queue management.</p>
      </div>
      <EmptyState
        icon={Timer}
        title="Not Yet Implemented"
        description="Background job monitoring, queue depth, and worker status will be available in a future release. The event bus and audit log are ready to receive job events."
      />
    </div>
  );
}
