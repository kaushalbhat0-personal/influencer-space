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
      <PageHeader title="New Client Website" description="Create a client website — give Pendallo a business profile and we intelligently build the site. Works without YouTube or Instagram."
        breadcrumbs={[{ label: "Agency", href: "/agency" }, { label: "New Client Website" }]} />
      <CreatorImportClient agencyId={agencyId ?? ""} />
    </ContentContainer>
  );
}
