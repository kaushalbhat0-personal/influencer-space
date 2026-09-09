// ── Agency Tenant Resolver — RCCF-AGENCY-08 ──────────────────────
// Agency Resend is stored as TenantIntegration on the agency's own Tenant.
// Agencies have WebsiteAgency + Workspace (type AGENCY). That Workspace has
// no tenantId by default. We lazily create a minimal Tenant for the agency
// and link its Workspace so TenantIntegration can be reused without schema
// migration or duplicate storage.

import { prisma } from "@/lib/prisma";

export async function getAgencyTenantId(agencyId: string): Promise<string | null> {
  const agency = await prisma.websiteAgency.findUnique({
    where: { id: agencyId },
    select: { id: true, name: true, subdomain: true },
  });
  if (!agency) return null;

  const workspace = await prisma.workspace.findUnique({
    where: { agencyId },
    select: { id: true, tenantId: true },
  });

  if (workspace?.tenantId) return workspace.tenantId;

  // No tenant yet — create a minimal Tenant for the agency's Resend storage.
  // Subdomain must be unique across Tenant; derive from agency subdomain.
  const baseSubdomain = agency.subdomain ? `${agency.subdomain}-agency` : `agency-${agencyId.slice(0, 8)}`;
  const subdomain = baseSubdomain.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  // Ensure uniqueness with suffix if needed
  let attempt = 0;
  let created: { id: string } | null = null;
  while (!created && attempt < 5) {
    const candidate = attempt === 0 ? subdomain : `${subdomain}-${attempt + 1}`;
    try {
      const tenant = await prisma.tenant.create({
        data: {
          name: agency.name ?? "Agency",
          subdomain: candidate,
        },
        select: { id: true },
      });
      created = tenant;
      // Link workspace to tenant for future lookups
      if (workspace) {
        await prisma.workspace.update({
          where: { id: workspace.id },
          data: { tenantId: tenant.id },
        }).catch(() => {});
      } else {
        // No workspace yet — create one for agency (type AGENCY) linked to tenant
        await prisma.workspace.create({
          data: {
            type: "AGENCY",
            name: agency.name ?? "Agency",
            slug: `agency-${agencyId.slice(0, 8)}`,
            agencyId: agency.id,
            tenantId: tenant.id,
          },
        }).catch(() => {});
      }
    } catch (e) {
      if (typeof e === "object" && e !== null && (e as { code?: string }).code === "P2002") {
        attempt++;
        continue;
      }
      return null;
    }
  }
  return created?.id ?? null;
}

export async function getAgencyTenantIdForRead(agencyId: string): Promise<string | null> {
  const workspace = await prisma.workspace.findUnique({
    where: { agencyId },
    select: { tenantId: true },
  });
  if (workspace?.tenantId) return workspace.tenantId;
  // Do not create tenant on read — only on write (save)
  return null;
}
