import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer, PageHeader } from "@/components/layout";
import { agencyBranding, type AgencyBrand } from "@/lib/client/branding";
import { BrandingClient } from "./_components/branding-client";

export const dynamic = "force-dynamic";

export default async function AgencyBrandingPage() {
  const session = await getServerSession(authOptions);
  const agencyId = (session?.user as { agencyId?: string })?.agencyId;
  if (!agencyId) return <ContentContainer><p className="text-red-400">Unauthorized</p></ContentContainer>;

  const brand = await agencyBranding.getBrand(agencyId);

  return (
    <ContentContainer>
      <PageHeader
        title="White Label Branding"
        description="Customize how your agency appears to clients."
        breadcrumbs={[{ label: "Dashboard", href: "/agency" }, { label: "Branding" }]}
      />
      <BrandingClient agencyId={agencyId} initial={brand as AgencyBrand} />
    </ContentContainer>
  );
}
