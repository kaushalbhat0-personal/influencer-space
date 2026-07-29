import { EmptyState } from "@/components/ui/EmptyState";
import { MessageSquare } from "lucide-react";

export default function FeedbackPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Feedback</h1>
        <p className="mt-1 text-sm text-zinc-400">Creator feedback and feature requests.</p>
      </div>
      <EmptyState
        icon={MessageSquare}
        title="Not Yet Implemented"
        description="Feedback collection and management will be built in a future release. The platform event bus is ready to receive feedback events."
      />
    </div>
  );
}
