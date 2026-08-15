import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSiteUrlForAdmin } from "@/lib/config/platform";
import { AdminLayoutClient } from "./_components/admin-layout-client";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { filterNavForPlan, ADMIN_NAV } from "@/lib/capabilities/nav-visibility";
import { DEFAULT_PLAN_CODE } from "@/lib/capabilities/constants";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const tenantId = session?.user?.tenantId;

  let siteUrl = "/";
  let publishStatus: PublishStatusValue = "unavailable";

  // RCCF-67.4 — capability-aware navigation: resolve the tenant's ACTIVE plan
  // server-side and project only the items that plan actually permits. UX only;
  // direct-URL access remains protected by the existing server gates.
  const planCode = tenantId
    ? await resolveActivePlan(undefined, tenantId)
        .then((p) => p.code ?? DEFAULT_PLAN_CODE)
        .catch(() => DEFAULT_PLAN_CODE)
    : DEFAULT_PLAN_CODE;
  const visibleNav = filterNavForPlan(ADMIN_NAV, planCode);

  if (tenantId) {
    const [tenant, website] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { customDomain: true, subdomain: true },
      }),
      prisma.website.findUnique({
        where: { tenantId },
        select: {
          publishStatus: { select: { state: true, liveVersion: true } },
        },
      }),
    ]);

    if (tenant) {
      siteUrl = buildSiteUrlForAdmin(tenant.customDomain, tenant.subdomain);
    }

    const dbState = website?.publishStatus?.state;
    const liveVersion = website?.publishStatus?.liveVersion;
    if (dbState === "live") publishStatus = "published";
    else if (dbState === "preview") publishStatus = "preview";
    else if (dbState === "draft" && liveVersion && liveVersion > 0) publishStatus = "outdated";
    else publishStatus = "draft";
  }

  return <AdminLayoutClient siteUrl={siteUrl} publishStatus={publishStatus} nav={visibleNav}>{children}</AdminLayoutClient>;
}
