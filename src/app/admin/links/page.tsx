import { requireTenant } from "@/lib/auth/require-tenant";
import { ContentContainer } from "@/components/layout";
import { LinksManager } from "@/features/links/components/links-page";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const { tenantId } = await requireTenant();

  const { getLinks } = await import("@/actions/link.actions");
  const result = await getLinks(tenantId);
  const links = result.success && result.data ? result.data : [];

  return (
    <ContentContainer>
      <LinksManager tenantId={tenantId} initialLinks={links} />
    </ContentContainer>
  );
}
