import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { CreatorImportClient } from "./_components/creator-import-client";

export const dynamic = "force-dynamic";

export default async function AgencyGeneratePage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;

  return (
    <ContentContainer>
      <PageHeader title="Creator Import" description="Provision a new creator, link them to your agency, and send a passwordless invitation."
        breadcrumbs={[{ label: "Agency", href: "/agency" }, { label: "Creator Import" }]} />
      <CreatorImportClient agencyId={agencyId ?? ""} />
    </ContentContainer>
  );
}
