import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getStorefrontData } from "@/lib/storefront/storefront-loader";
import { prisma } from "@/lib/prisma";
import { publishSnapshotService } from "@/lib/publishing/snapshot";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const slug = req.nextUrl.searchParams.get("slug") || "3-all-day";
  try {
    const data = await getStorefrontData(slug);
    const tenant = await prisma.tenant.findFirst({ where: { OR: [{ subdomain: slug }, { customDomain: slug }] } });
    let debug: Record<string, unknown> = {};
    if (tenant) {
      const website = await prisma.website.findUnique({ where: { tenantId: tenant.id } });
      if (website) {
        const ps = await prisma.publishStatus.findUnique({ where: { websiteId: website.id } });
        const live = await publishSnapshotService.getLive(website.id).catch(() => null);
        const liveCached = await publishSnapshotService.getLiveCached(website.id, tenant.id).catch(() => null);
        debug = { websiteId: website.id, publishStatus: ps, live, liveCached: !!liveCached?.data, liveVersion: live?.version };
      }
    }
    return NextResponse.json({ slug, hasData: !!data, tenantId: data?.tenantId, hasSnapshot: !!data?.snapshot, previewAuthorized: data?.previewAuthorized, debug });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
