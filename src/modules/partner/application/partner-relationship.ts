/**
 * AgencyTenant Relationship Engine (IMPLEMENTATION-41) — the canonical write
 * path for the agency↔creator relationship discovered missing in AUDIT-02.
 *
 * `AgencyTenant` becomes the single source of truth linking WebsiteAgency →
 * Creator Tenant → Workspace. No duplicate relationship tables. When an
 * AGENCY_ADMIN creates/imports/provisions a creator, this service upserts the
 * link (tenantId is unique) with the agency's rev-share defaults.
 *
 * RCCF-40 — the CREATE path enforces the Partner's effective `max_clients`
 * atomically: the agency row is locked (SELECT … FOR UPDATE) so concurrent
 * client creations serialize, then ACTIVE AgencyTenant links are counted
 * against the plan's `max_clients` (resolved server-side from the Partner's
 * BillingSubscription — never client-supplied). Exactly one concurrent
 * final-slot creation can succeed.
 */
import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { resolveActivePlan } from "@/modules/billing/application/plan-source";
import { capabilityService } from "@/lib/capabilities";

/** Least-privileged PARTNER plan used when a Partner has no resolvable subscription. */
const PARTNER_FALLBACK_PLAN = "partner_free";

export class ClientCapacityError extends Error {
  constructor(
    public used: number,
    public limit: number,
    public planCode: string,
  ) {
    super(`Client capacity reached (${used}/${limit}) for plan ${planCode}. Upgrade your partner plan to add more clients.`);
    this.name = "ClientCapacityError";
  }
}

export interface AgencyClientCapacity {
  planCode: string;
  limit: number;
  used: number;
}

/** Resolve the Partner's effective plan + max_clients from its BillingSubscription. */
async function resolvePartnerCapacity(agencyId: string): Promise<{ planCode: string; limit: number }> {
  const workspace = await prisma.workspace.findUnique({ where: { agencyId }, select: { id: true } });
  const resolved = await resolveActivePlan(workspace?.id, undefined);
  // RCCF-40: a Partner with no resolvable subscription falls back to the
  // least-privileged Partner plan (partner_free) — never a privileged one.
  const planCode = resolved.code && resolved.code.startsWith("partner") ? resolved.code : PARTNER_FALLBACK_PLAN;
  const limit = capabilityService.limit(planCode, "max_clients");
  return { planCode, limit };
}

/** Read-only capacity for fail-fast checks/displays (the atomic gate is linkCreator). */
export async function getAgencyClientCapacity(agencyId: string): Promise<AgencyClientCapacity> {
  const { planCode, limit } = await resolvePartnerCapacity(agencyId);
  const used = await prisma.agencyTenant.count({ where: { agencyId, status: "ACTIVE" } });
  return { planCode, limit, used };
}

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

    // RCCF-40 — atomic client-capacity enforcement for NEW client links.
    const capacity = await resolvePartnerCapacity(input.agencyId);
    const createdId = await prisma.$transaction(async (tx) => {
      // Row-level lock on the agency serializes concurrent client creations for
      // the same Partner, so two final-slot creates cannot both pass.
      await tx.$queryRaw`SELECT id FROM "website_agency" WHERE id = ${input.agencyId} FOR UPDATE`;
      const activeCount = await tx.agencyTenant.count({ where: { agencyId: input.agencyId, status: "ACTIVE" } });
      if (capacity.limit !== -1 && activeCount >= capacity.limit) {
        throw new ClientCapacityError(activeCount, capacity.limit, capacity.planCode);
      }
      const created = await tx.agencyTenant.create({
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
      return created.id;
    });

    await logAction(input.tenantId, "partner:creator-linked", { agencyId: input.agencyId, agencyTenantId: createdId }).catch(() => {});
    return { linked: true, id: createdId };
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

  /**
   * RCCF-42 — offboard an agency↔creator relationship. Transitions the
   * relationship to REVOKED (no longer counted toward the Partner's max_clients)
   * and records offboardedAt. The Creator tenant, website, snapshots, products,
   * orders, billing history and commissions are ALL preserved — only the
   * management relationship ends. Authorization (agency owns the relationship)
   * is the caller's responsibility.
   */
  async offboard(relationshipId: string, agencyId: string): Promise<{ success: boolean; error?: string }> {
    const link = await prisma.agencyTenant.findUnique({ where: { id: relationshipId } });
    if (!link) return { success: false, error: "Relationship not found" };
    if (link.agencyId !== agencyId) return { success: false, error: "Creator not managed by this agency" };
    if (link.status !== "ACTIVE") return { success: false, error: "Relationship is not active" };

    await prisma.agencyTenant.update({
      where: { id: link.id },
      data: { status: "REVOKED", offboardedAt: new Date() },
    });
    await logAction(link.tenantId, "partner:creator-offboarded", { agencyId, relationshipId: link.id }).catch(() => {});
    return { success: true };
  }
}

export const agencyTenantRelationship = new AgencyTenantRelationshipService();
