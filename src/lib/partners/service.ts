import { partnerEngine } from "./engine";
import type { PartnerType, PartnerRole, PartnerStatus } from "./constants";
import type {
  Partner,
  PartnerMember,
  PartnerWorkspace,
  PartnerInvite,
  PartnerStatistics,
  PartnerDashboardSummary,
  PartnerActivityItem,
  OwnershipCheck,
  PartnerQuery,
} from "./types";
import { toDashboardSummary } from "./mapper";
import { buildPartnerFilter, applyPartnerFilter, applyPartnerSort, paginatePartners } from "./queries";
import { getPlan } from "@/lib/capabilities";

export class PartnerService {
  async create(params: {
    id: string; type: PartnerType; businessName: string; country?: string; timezone?: string;
  }): Promise<Partner> {
    return partnerEngine.createPartner(params);
  }

  async get(id: string): Promise<Partner | undefined> {
    return partnerEngine.getPartner(id);
  }

  async update(id: string, updates: Partial<Partner>): Promise<Partner | undefined> {
    return partnerEngine.updatePartner(id, updates);
  }

  async updateProfile(id: string, profile: Partial<Partner["profile"]>): Promise<Partner | undefined> {
    return partnerEngine.updateProfile(id, profile);
  }

  async updateSettings(id: string, settings: Partial<Partner["settings"]>): Promise<Partner | undefined> {
    return partnerEngine.updateSettings(id, settings);
  }

  async setStatus(id: string, status: PartnerStatus): Promise<Partner | undefined> {
    return partnerEngine.setStatus(id, status);
  }

  async list(query?: PartnerQuery): Promise<{ items: Partner[]; total: number; hasMore: boolean }> {
    let partners = await partnerEngine.listPartners();
    if (query) {
      const filter = buildPartnerFilter(query);
      partners = applyPartnerFilter(partners, filter);
      partners = applyPartnerSort(partners, { by: query.sortBy ?? "createdAt", order: query.sortOrder ?? "desc" });
    }
    return paginatePartners(partners, query?.limit, query?.offset);
  }

  async addMember(partnerId: string, member: PartnerMember): Promise<boolean> {
    return partnerEngine.addMember(partnerId, member);
  }

  async removeMember(partnerId: string, userId: string): Promise<boolean> {
    return partnerEngine.removeMember(partnerId, userId);
  }

  async updateMemberRole(partnerId: string, userId: string, role: PartnerRole): Promise<boolean> {
    return partnerEngine.updateMemberRole(partnerId, userId, role);
  }

  async getMembers(partnerId: string): Promise<PartnerMember[]> {
    return partnerEngine.getMembers(partnerId);
  }

  async getMember(partnerId: string, userId: string): Promise<PartnerMember | undefined> {
    return partnerEngine.getMember(partnerId, userId);
  }

  async assignWorkspace(
    partnerId: string, workspaceId: string, workspaceSlug: string, workspaceName: string,
    assignedBy: string, reason: PartnerWorkspace["reason"],
  ): Promise<{ success: boolean; error?: string }> {
    return partnerEngine.assignWorkspace(partnerId, workspaceId, workspaceSlug, workspaceName, assignedBy, reason);
  }

  async unassignWorkspace(partnerId: string, workspaceId: string): Promise<{ success: boolean; error?: string }> {
    return partnerEngine.unassignWorkspace(partnerId, workspaceId);
  }

  async transferWorkspace(
    currentPartnerId: string, targetPartnerId: string, workspaceId: string,
    workspaceSlug: string, workspaceName: string, transferredBy: string,
  ): Promise<{ success: boolean; error?: string }> {
    const target = await partnerEngine.getPartner(targetPartnerId);
    if (!target) return { success: false, error: "Target partner not found" };
    return partnerEngine.transferWorkspace(currentPartnerId, targetPartnerId, workspaceId, workspaceSlug, workspaceName, transferredBy);
  }

  async canManageWorkspace(partnerId: string, workspaceId: string): Promise<boolean> {
    return partnerEngine.canManageWorkspace(partnerId, workspaceId);
  }

  async checkOwnership(partnerId: string, workspaceId: string): Promise<OwnershipCheck> {
    return partnerEngine.checkOwnership(partnerId, workspaceId);
  }

  async listManagedWorkspaces(partnerId: string): Promise<string[]> {
    return partnerEngine.listManagedWorkspaces(partnerId);
  }

  async getWorkspaces(partnerId: string): Promise<PartnerWorkspace[]> {
    return partnerEngine.getWorkspaces(partnerId);
  }

  async getActiveWorkspaces(partnerId: string): Promise<PartnerWorkspace[]> {
    return partnerEngine.getActiveWorkspaces(partnerId);
  }

  async workspaceCount(partnerId: string): Promise<number> {
    return partnerEngine.workspaceCount(partnerId);
  }

  async remainingWorkspaceCapacity(partnerId: string): Promise<number> {
    return partnerEngine.remainingWorkspaceCapacity(partnerId);
  }

  async remainingClientCapacity(partnerId: string): Promise<number> {
    return partnerEngine.remainingClientCapacity(partnerId);
  }

  async createInvite(params: {
    partnerId: string; email: string; role: PartnerRole; invitedById: string; message?: string;
  }): Promise<PartnerInvite | { error: string }> {
    return partnerEngine.createInvite(params);
  }

  async acceptInvite(inviteId: string, userId: string, userEmail: string): Promise<{ success: boolean; error?: string; partnerId?: string }> {
    return partnerEngine.acceptInvite(inviteId, userId, userEmail);
  }

  async declineInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    return partnerEngine.declineInvite(inviteId);
  }

  async revokeInvite(partnerId: string, inviteId: string): Promise<{ success: boolean; error?: string }> {
    return partnerEngine.revokeInvite(partnerId, inviteId);
  }

  async expireStaleInvites(): Promise<number> {
    return partnerEngine.expireStaleInvites();
  }

  async getInvites(partnerId: string): Promise<PartnerInvite[]> {
    return partnerEngine.getInvites(partnerId);
  }

  async getPendingInvites(partnerId: string): Promise<PartnerInvite[]> {
    return partnerEngine.getPendingInvites(partnerId);
  }

  async getStatistics(partnerId: string): Promise<PartnerStatistics | null> {
    return partnerEngine.getStatistics(partnerId);
  }

  async getDashboard(partnerId: string, planCode?: string): Promise<PartnerDashboardSummary | null> {
    const partner = await partnerEngine.getPartner(partnerId);
    if (!partner) return null;
    const stats = await partnerEngine.getStatistics(partnerId);
    if (!stats) return null;
    const activity = partnerEngine.getActivity(partnerId);
    const planCodeResolved = planCode ?? "partner_free";
    const plan = getPlan(planCodeResolved);
    return toDashboardSummary(partner, stats, activity, planCodeResolved, plan?.name ?? planCodeResolved);
  }

  getActivity(partnerId: string, limit = 20): PartnerActivityItem[] {
    return partnerEngine.getActivity(partnerId, limit);
  }
}

export const partnerService = new PartnerService();
