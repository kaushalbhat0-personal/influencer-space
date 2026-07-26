import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ContentContainer } from "@/components/layout";
import { LinksManager } from "@/features/links/components/links-page";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
          <p className="text-lg font-semibold">Unauthorized</p>
        </div>
      </ContentContainer>
    );
  }

  const { getLinks } = await import("@/actions/link.actions");
  const result = await getLinks(tenantId);
  const links = result.success && result.data ? result.data : [];

  return (
    <ContentContainer>
      <LinksManager tenantId={tenantId} initialLinks={links} />
    </ContentContainer>
  );
}
