import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";
export default function AgencyBilling() {
  return <ContentContainer><PageHeader title="Billing" description="Agency subscription and client billing." breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Billing" }]} /><EmptyState title="Billing coming soon" description="Manage your agency plan, invoices, and client billing." icon={CreditCard} /></ContentContainer>;
}
