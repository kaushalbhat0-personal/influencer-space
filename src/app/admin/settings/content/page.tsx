import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ContentContainer } from "@/components/layout";
import { ContentFeedManager } from "@/features/settings/components/content-feed-manager";

export const dynamic = "force-dynamic";

export default async function ContentFeedSettingsPage() {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  if (!tenantId) {
    return (
      <ContentContainer>
        <h1 className="platform-display">Content Feed</h1>
        <p className="mt-4 text-[var(--text-muted)]">No tenant configured. Please seed a tenant first.</p>
      </ContentContainer>
    );
  }

  const items = await prisma.contentFeedItem.findMany({
    where: { tenantId },
    orderBy: [{ pinned: "desc" }, { order: "asc" }, { createdAt: "desc" }],
  });

  return (
    <ContentContainer>
      <div className="mb-6">
        <h1 className="platform-display">Content Feed</h1>
        <p className="platform-body mt-1.5">
          Manage synced social media content. Pin important posts, hide irrelevant ones, or delete items.
        </p>
      </div>
      <ContentFeedManager
        tenantId={tenantId}
        initialItems={items.map((item) => ({
          ...item,
          syncedAt: item.syncedAt.toISOString(),
          createdAt: item.createdAt.toISOString(),
        }))}
      />
    </ContentContainer>
  );
}
