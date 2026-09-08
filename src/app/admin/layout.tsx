import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { buildSiteUrlForAdmin } from "@/lib/config/platform";
import { AdminLayoutClient } from "./_components/admin-layout-client";
import type { PublishStatusValue } from "@/components/publish/PublishStatusBadge";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { filterNavForPlan, toNavWire, ADMIN_NAV } from "@/lib/capabilities/nav-visibility";
import { DEFAULT_PLAN_CODE } from "@/lib/capabilities/constants";
import { GuidanceShell } from "@/components/guidance/GuidanceShell";

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
  // RCCF-70.6.2 — the nav crossed the Server → Client boundary with Lucide
  // `forwardRef` icon components (`{$$typeof, render, displayName}`), which
  // Next.js cannot serialize in an RSC payload and caused every /admin/* route
  // to fail with "Unsupported Server Component type: forwardRef". Capability
  // filtering stays server-side; `toNavWire` projects only serializable
  // iconKey strings, and the client resolves icons via its own registry.
  // RCCF-13F — gate Create Website to AGENCY workspace (TENANT has one primary website, edits via Builder)
  const workspaceType = session?.user?.workspaceType ?? null;
  const userRole = session?.user?.role ?? null;
  let visibleNav = toNavWire(filterNavForPlan(ADMIN_NAV, planCode, workspaceType, userRole));

  // 14B: dynamic Content nav for TENANT — derive from canonical BuilderService Page sections
  if (tenantId) {
    try {
      const { getDynamicContentNavWithAddSection } = await import("@/lib/navigation/dynamic-content");
      const dynamicContentItems = await getDynamicContentNavWithAddSection(tenantId);
      const contentIdx = ADMIN_NAV.groups.findIndex((g) => g.label === "Content");
      if (contentIdx !== -1 && dynamicContentItems.length > 0) {
        const base = filterNavForPlan(ADMIN_NAV, planCode, workspaceType, userRole);
        const groups = base.groups.map((g, idx) => {
          if (idx === contentIdx) {
            return { ...g, items: dynamicContentItems as unknown as typeof g.items };
          }
          return g;
        });
        visibleNav = toNavWire({ groups, footer: base.footer });
      }
    } catch {}
  }

  let density: "compact" | "comfortable" | "spacious" = "comfortable";
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
          themeConfig: true,
        },
      }),
    ]);
    const cfg = (website?.themeConfig ?? {}) as Record<string, string>;
    if (cfg.layoutDensity === "compact" || cfg.layoutDensity === "spacious") density = cfg.layoutDensity as typeof density;

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

  return (
    <>
      <AdminLayoutClient siteUrl={siteUrl} publishStatus={publishStatus} nav={visibleNav} density={density}>{children}</AdminLayoutClient>
      <GuidanceShell audience="creator" helpContext="Dashboard" />
    </>
  );
}
