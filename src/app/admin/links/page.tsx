import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getLinks } from "@/actions/link.actions";
import { LinksManager } from "./_components/links-manager";
import type { LinkData } from "@/actions/link.actions";

export const dynamic = "force-dynamic";

export default async function AdminLinksPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <div className="rounded-lg bg-red-500/10 p-6 text-center text-red-400">
        <p className="text-lg font-semibold">No tenant configured</p>
      </div>
    );
  }

  const result = await getLinks(tenantId);
  const links: LinkData[] = result.success && result.data ? result.data : [];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Links & Affiliates</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Manage your affiliate links, sponsor deals, and referral URLs.
        </p>
      </div>
      <LinksManager tenantId={tenantId} initialLinks={links} />
    </div>
  );
}
