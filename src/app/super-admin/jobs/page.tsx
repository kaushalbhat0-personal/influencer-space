import { EmptyState } from "@/components/ui/EmptyState";
import { Timer } from "lucide-react";
export default function JobsPlaceholder() {
  return <div className="pt-8"><EmptyState title="Background Jobs" description="Cron job status, queue depth, and job history. Coming in CreatorStore v1.1." icon={Timer} /></div>;
}
