import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart3 } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AgencyAnalytics() {
  return <ContentContainer><PageHeader title="Analytics" description="Cross-client performance metrics." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Analytics" }]} /><EmptyState title="Analytics coming soon" description="Track revenue and growth across all your clients." icon={BarChart3} /></ContentContainer>;
}
