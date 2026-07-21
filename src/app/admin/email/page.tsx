import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { EmptyState } from "@/components/ui/EmptyState";
import { Mail } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function EmailPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.tenantId) {
    return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;
  }

  return (
    <ContentContainer>
      <PageHeader
        title="Email Campaigns"
        description="Create and send newsletters, promotional emails, and automated sequences."
        breadcrumbs={[{ label: "Grow", href: "/admin/analytics" }, { label: "Email" }]}
        status={{ label: "Coming Soon", variant: "default" }}
      />
      <EmptyState
        title="Email tools coming soon"
        description="Newsletter builder, audience segmentation, and campaign analytics."
        icon={Mail}
      />
    </ContentContainer>
  );
}
