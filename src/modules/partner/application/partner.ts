/**
 * Partner business concept (IMPLEMENTATION-41) — a higher-level business
 * abstraction mapped onto the existing `WebsiteAgency` model WITHOUT renaming
 * it. Agencies, freelancers, consultants and implementation partners all fit
 * this business model today; IMPLEMENTATION-42 (commission/settlement) will
 * attach to the Partner concept while the data model stays unchanged.
 */
import { prisma } from "@/lib/prisma";

export type PartnerType =
  | "agency"
  | "freelancer"
  | "consultant"
  | "implementation_partner"
  | "white_label";

export interface PartnerProfile {
  id: string;
  name: string;
  type: PartnerType;
  subdomain: string;
  customDomain: string | null;
  status: string;
  platformFeePercent: number;
  defaultThemeId: string | null;
  creatorCount: number;
  createdAt: Date;
}

const PARTNER_TYPE_HINTS: Array<{ match: (a: { isFreelancer?: boolean; workspace?: { isFreelancer?: boolean } | null }) => boolean; type: PartnerType }> = [
  { match: (a) => !!a.workspace?.isFreelancer, type: "freelancer" },
  { match: () => true, type: "agency" },
];

export function partnerTypeFor(agency: { isFreelancer?: boolean; workspace?: { isFreelancer?: boolean } | null }): PartnerType {
  for (const hint of PARTNER_TYPE_HINTS) {
    if (hint.match(agency)) return hint.type;
  }
  return "agency";
}

export class PartnerService {
  async getById(agencyId: string): Promise<PartnerProfile | null> {
    const agency = await prisma.websiteAgency.findUnique({
      where: { id: agencyId },
      include: { workspace: { select: { isFreelancer: true } }, _count: { select: { tenants: true } } },
    });
    if (!agency) return null;
    return {
      id: agency.id,
      name: agency.name,
      type: partnerTypeFor({ isFreelancer: agency.workspace?.isFreelancer, workspace: agency.workspace }),
      subdomain: agency.subdomain,
      customDomain: agency.customDomain,
      status: agency.status,
      platformFeePercent: agency.platformFeePercent,
      defaultThemeId: agency.defaultThemeId,
      creatorCount: agency._count.tenants,
      createdAt: agency.createdAt,
    };
  }

  async list(): Promise<PartnerProfile[]> {
    const agencies = await prisma.websiteAgency.findMany({
      include: { workspace: { select: { isFreelancer: true } }, _count: { select: { tenants: true } } },
      orderBy: { createdAt: "desc" },
    });
    return agencies.map((a) => ({
      id: a.id,
      name: a.name,
      type: partnerTypeFor({ isFreelancer: a.workspace?.isFreelancer, workspace: a.workspace }),
      subdomain: a.subdomain,
      customDomain: a.customDomain,
      status: a.status,
      platformFeePercent: a.platformFeePercent,
      defaultThemeId: a.defaultThemeId,
      creatorCount: a._count.tenants,
      createdAt: a.createdAt,
    }));
  }
}

export const partnerService = new PartnerService();
