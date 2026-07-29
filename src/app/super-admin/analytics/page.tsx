import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Product Analytics</h1>
        <p className="mt-1 text-sm text-zinc-400">Platform analytics dashboard.</p>
      </div>
      <EmptyState
        icon={BarChart3}
        title="Not Yet Implemented"
        description="Platform analytics — activation funnel, conversion rates, and growth metrics — will be built in SUPERADMIN-01. Integration with the existing event bus and audit log is planned."
      />
    </div>
  );
}
