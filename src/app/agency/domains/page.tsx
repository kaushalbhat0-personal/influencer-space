import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Globe } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AgencyDomains() {
  return <ContentContainer><PageHeader title="Domains" description="Manage client custom domains." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Domains" }]} /><EmptyState title="Domain management coming soon" description="Configure custom domains for your client websites." icon={Globe} /></ContentContainer>;
}
