/**
 * AgencyTenant Relationship Engine (IMPLEMENTATION-41) — the canonical write
 * path for the agency↔creator relationship discovered missing in AUDIT-02.
 *
 * `AgencyTenant` becomes the single source of truth linking WebsiteAgency →
 * Creator Tenant → Workspace. No duplicate relationship tables. When an
 * AGENCY_ADMIN creates/imports/provisions a creator, this service upserts the
 * link (tenantId is unique) with the agency's rev-share defaults.
 */
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";

export interface LinkCreatorInput {
  agencyId: string;
  tenantId: string;
  workspaceId?: string | null;
  revSharePercent?: number;
  productRevSharePercent?: number;
  canEditTheme?: boolean;
  canEditProducts?: boolean;
  canEditGallery?: boolean;
  canEditLinks?: boolean;
  canEditMilestones?: boolean;
  canEditSettings?: boolean;
}

export class AgencyTenantRelationshipService {
  /** Upsert the agency↔creator link (single source of truth). */
  async linkCreator(input: LinkCreatorInput): Promise<{ linked: boolean; id: string }> {
    const existing = await prisma.agencyTenant.findUnique({ where: { tenantId: input.tenantId } });
    const agency = await prisma.websiteAgency.findUnique({
      where: { id: input.agencyId },
      select: { status: true },
    });
    if (!agency || (agency.status !== "ACTIVE" && agency.status !== "TRIAL")) {
      throw new Error("Agency is not active");
    }

    if (existing) {
      if (existing.agencyId !== input.agencyId) {
        throw new Error("Creator already linked to another agency");
      }
      await prisma.agencyTenant.update({
        where: { id: existing.id },
        data: {
          workspaceId: input.workspaceId ?? existing.workspaceId,
          status: "ACTIVE",
          ...(input.revSharePercent !== undefined ? { revSharePercent: input.revSharePercent } : {}),
          ...(input.productRevSharePercent !== undefined ? { productRevSharePercent: input.productRevSharePercent } : {}),
        },
      });
      await logAction(input.tenantId, "partner:creator-linked", { agencyId: input.agencyId, updated: true }).catch(() => {});
      return { linked: true, id: existing.id };
    }

    const created = await prisma.agencyTenant.create({
      data: {
        agencyId: input.agencyId,
        tenantId: input.tenantId,
        workspaceId: input.workspaceId ?? null,
        revSharePercent: input.revSharePercent ?? 20,
        productRevSharePercent: input.productRevSharePercent ?? 10,
        canEditTheme: input.canEditTheme ?? true,
        canEditProducts: input.canEditProducts ?? true,
        canEditGallery: input.canEditGallery ?? true,
        canEditLinks: input.canEditLinks ?? true,
        canEditMilestones: input.canEditMilestones ?? true,
        canEditSettings: input.canEditSettings ?? false,
        status: "ACTIVE",
      },
    });
    await logAction(input.tenantId, "partner:creator-linked", { agencyId: input.agencyId, agencyTenantId: created.id }).catch(() => {});
    return { linked: true, id: created.id };
  }

  /** Backfill missing workspaceId on existing links (idempotent repair). */
  async repairMissingLinks(agencyId: string): Promise<{ repaired: number }> {
    const links = await prisma.agencyTenant.findMany({
      where: { agencyId },
      select: { id: true, tenantId: true, workspaceId: true },
    });
    let repaired = 0;
    for (const link of links) {
      if (link.workspaceId) continue;
      const workspace = await prisma.workspace.findUnique({
        where: { tenantId: link.tenantId },
        select: { id: true },
      });
      if (workspace) {
        await prisma.agencyTenant.update({ where: { id: link.id }, data: { workspaceId: workspace.id } });
        repaired++;
      }
    }
    return { repaired };
  }
}

export const agencyTenantRelationship = new AgencyTenantRelationshipService();
