import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Users } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AgencyTeam() {
  return <ContentContainer><PageHeader title="Team" description="Manage your agency staff." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Team" }]} /><EmptyState title="Team management coming soon" description="Invite staff members with role-based permissions." icon={Users} /></ContentContainer>;
}
