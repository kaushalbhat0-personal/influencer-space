import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Layers } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AgencyTemplates() {
  return <ContentContainer><PageHeader title="Templates" description="Reusable website templates for your clients." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Templates" }]} /><EmptyState title="Templates coming soon" description="Create and share website templates across your client base." icon={Layers} /></ContentContainer>;
}
