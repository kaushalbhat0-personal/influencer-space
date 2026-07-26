import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL || "";
if (!connectionString) {
  console.warn("[reset-alpha] No database URL configured. Skipping cleanup.");
  process.exit(0);
}

const ALPHA_TEST_EMAILS = [
  "alpha-test@creatorstore.test",
  "v1-test@creatorstore.test",
];

async function resetAlphaDataset(): Promise<void> {
  let prisma: PrismaClient;

  try {
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    await prisma.$connect();
  } catch {
    console.warn("[reset-alpha] Database not reachable. Skipping cleanup.");
    return;
  }

  console.log("[reset-alpha] Starting alpha dataset cleanup...");

  try {
    const testUsers = await prisma.user.findMany({
      where: { email: { in: ALPHA_TEST_EMAILS } },
      select: { id: true },
    });
    const userIds = testUsers.map((u) => u.id);
    console.log(`[reset-alpha] Found ${userIds.length} test users`);

    if (userIds.length === 0) {
      console.log("[reset-alpha] No test data found. Done.");
      await prisma.$disconnect();
      return;
    }

    const workspaceMemberRows = await prisma.workspaceMember.findMany({
      where: { userId: { in: userIds } },
      select: { workspaceId: true },
    });
    const workspaceIds = [...new Set(workspaceMemberRows.map((w) => w.workspaceId))];

    const tenantRows = await prisma.tenant.findMany({
      where: { ownerId: { in: userIds } },
      select: { id: true },
    });
    const tenantIds = [...new Set(tenantRows.map((t) => t.id))];

    const websiteRows = await prisma.website.findMany({
      where: {
        OR: [
          { workspaceId: { in: workspaceIds } },
          { tenantId: { in: tenantIds } },
        ],
      },
      select: { id: true },
    });
    const websiteIds = [...new Set(websiteRows.map((w) => w.id))];
    console.log(`[reset-alpha] Found ${websiteIds.length} test websites`);

    for (const wid of websiteIds) {
      const pages = await prisma.storefrontPage.findMany({
        where: { websiteId: wid },
        select: { id: true },
      });
      const pageIds = pages.map((p) => p.id);
      await prisma.storefrontSection.deleteMany({ where: { pageId: { in: pageIds } } });
      await prisma.storefrontPage.deleteMany({ where: { id: { in: pageIds } } });

      const snapshots = await prisma.publishSnapshot.findMany({
        where: { websiteId: wid },
        select: { id: true },
      });
      const snapshotIds = snapshots.map((s) => s.id);
      await prisma.publishStatus.deleteMany({ where: { snapshotId: { in: snapshotIds } } });
      await prisma.publishSnapshot.deleteMany({ where: { id: { in: snapshotIds } } });

      const builderStates = await prisma.builderState.findMany({
        where: { websiteId: wid },
        select: { id: true },
      });
      const builderIds = builderStates.map((b) => b.id);
      await prisma.builderLayer.deleteMany({ where: { stateId: { in: builderIds } } });
      await prisma.builderState.deleteMany({ where: { id: { in: builderIds } } });
    }

    const sessions = await prisma.generationSession.findMany({
      where: { workspaceId: { in: workspaceIds } },
      select: { id: true },
    });
    const sessionIds = sessions.map((s) => s.id);
    await prisma.generationEvent.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.generationStage.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.generationProgress.deleteMany({ where: { sessionId: { in: sessionIds } } });
    await prisma.generationSession.deleteMany({ where: { id: { in: sessionIds } } });

    await prisma.website.deleteMany({ where: { id: { in: websiteIds } } });

    await prisma.workspaceMember.deleteMany({ where: { workspaceId: { in: workspaceIds } } });
    await prisma.workspace.deleteMany({ where: { id: { in: workspaceIds } } });

    await prisma.setting.deleteMany({ where: { tenantId: { in: tenantIds } } });
    await prisma.tenant.deleteMany({ where: { id: { in: tenantIds } } });

    await prisma.session.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.account.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  } finally {
    await prisma.$disconnect();
  }

  console.log("[reset-alpha] Cleanup complete.");
  console.log("[reset-alpha] Platform configuration, system settings, feature flags, roles, and seed data preserved.");
}

resetAlphaDataset()
  .catch((error) => {
    console.error("[reset-alpha] Error during cleanup:", error);
    process.exit(1);
  });
