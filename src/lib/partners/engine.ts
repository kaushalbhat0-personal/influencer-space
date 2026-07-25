import type { PartnerType, PartnerRole, PartnerStatus } from "./constants";
import { PARTNER_TYPES_CONFIG, INVITE_TTL_DAYS } from "./constants";
import type {
  Partner,
  PartnerMember,
  PartnerWorkspace,
  PartnerInvite,
  PartnerStatistics,
  PartnerActivityItem,
  OwnershipCheck,
} from "./types";
import { defaultProfile, defaultSettings, toStatistics } from "./mapper";
import { partnerRepository } from "./repositories/partner-repository";

export class PartnerEngine {
  private partners = new Map<string, Partner>();
  private members = new Map<string, PartnerMember[]>();
  private workspaces = new Map<string, PartnerWorkspace[]>();
  private invites = new Map<string, PartnerInvite[]>();
  private activityLog = new Map<string, PartnerActivityItem[]>();
  private initialized = false;

  async initialize(): Promise<{ partners: number; members: number; assignments: number; invites: number }> {
    if (this.initialized) return { partners: 0, members: 0, assignments: 0, invites: 0 };
    const stored = await partnerRepository.list();
    for (const p of stored) {
      this.partners.set(p.id, p);
      const rawMembers = await partnerRepository.getMembers(p.id);
      const storedMembers: PartnerMember[] = rawMembers.map((m) => ({
        id: m.id, partnerId: p.id, userId: m.userId,
        role: m.role as PartnerRole, status: m.status as "active" | "inactive", joinedAt: m.joinedAt,
      }));
      this.members.set(p.id, storedMembers);
      const storedWs = await partnerRepository.getWorkspaceAssignments(p.id);
      this.workspaces.set(p.id, storedWs.map((w) => ({
        id: w.id, partnerId: p.id, workspaceId: w.workspaceId, workspaceSlug: w.workspaceSlug ?? "",
        workspaceName: w.workspaceName, assignedAt: w.assignedAt, assignedBy: w.assignedBy,
        reason: w.reason as PartnerWorkspace["reason"], status: w.status as "active" | "transferred" | "removed",
      })));
      const storedInvites = await partnerRepository.getInvites(p.id);
      this.invites.set(p.id, storedInvites.map((i) => ({
        id: i.id, partnerId: p.id, email: i.email, role: i.role as PartnerRole,
        status: i.status as PartnerInvite["status"], invitedById: i.invitedBy,
        expiresAt: i.expiresAt, createdAt: i.createdAt, message: i.message ?? undefined,
      })));
      this.activityLog.set(p.id, []);
    }
    this.initialized = true;
    return { partners: stored.length, members: Array.from(this.members.values()).reduce((s, m) => s + m.length, 0), assignments: Array.from(this.workspaces.values()).reduce((s, w) => s + w.length, 0), invites: Array.from(this.invites.values()).reduce((s, i) => s + i.length, 0) };
  }

  createPartner(params: {
    id: string; type: PartnerType; businessName: string; country?: string; timezone?: string;
  }): Partner {
    const profile = defaultProfile();
    profile.businessName = params.businessName;
    if (params.country) profile.country = params.country;
    if (params.timezone) profile.timezone = params.timezone;
    const partner: Partner = {
      id: params.id, type: params.type, status: "active", profile, settings: defaultSettings(),
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };
    this.partners.set(params.id, partner);
    this.members.set(params.id, []);
    this.workspaces.set(params.id, []);
    this.invites.set(params.id, []);
    this.activityLog.set(params.id, []);
    partnerRepository.create(params).catch(() => {});
    return partner;
  }

  getPartner(id: string): Partner | undefined {
    return this.partners.get(id);
  }

  updatePartner(id: string, updates: Partial<Partner>): Partner | undefined {
    const partner = this.partners.get(id);
    if (!partner) return undefined;
    const updated = { ...partner, ...updates, updatedAt: new Date().toISOString() };
    this.partners.set(id, updated);
    return updated;
  }

  updateProfile(id: string, profile: Partial<Partner["profile"]>): Partner | undefined {
    const partner = this.partners.get(id);
    if (!partner) return undefined;
    partner.profile = { ...partner.profile, ...profile };
    partner.updatedAt = new Date().toISOString();
    partnerRepository.updateProfile(id, profile).catch(() => {});
    return partner;
  }

  updateSettings(id: string, settings: Partial<Partner["settings"]>): Partner | undefined {
    const partner = this.partners.get(id);
    if (!partner) return undefined;
    partner.settings = { ...partner.settings, ...settings };
    partner.updatedAt = new Date().toISOString();
    return partner;
  }

  setStatus(id: string, status: PartnerStatus): Partner | undefined {
    const partner = this.partners.get(id);
    if (!partner) return undefined;
    partner.status = status;
    partner.updatedAt = new Date().toISOString();
    partnerRepository.setStatus(id, status).catch(() => {});
    return partner;
  }

  listPartners(): Partner[] {
    return Array.from(this.partners.values());
  }

  addMember(partnerId: string, member: PartnerMember): boolean {
    const members = this.members.get(partnerId);
    if (!members) return false;
    if (members.some((m) => m.userId === member.userId)) return false;
    members.push(member);
    partnerRepository.addMember(partnerId, member).catch(() => {});
    return true;
  }

  removeMember(partnerId: string, userId: string): boolean {
    const members = this.members.get(partnerId);
    if (!members) return false;
    const idx = members.findIndex((m) => m.userId === userId);
    if (idx === -1) return false;
    members.splice(idx, 1);
    partnerRepository.removeMember(partnerId, userId).catch(() => {});
    return true;
  }

  updateMemberRole(partnerId: string, userId: string, role: PartnerRole): boolean {
    const members = this.members.get(partnerId);
    if (!members) return false;
    const member = members.find((m) => m.userId === userId);
    if (!member) return false;
    member.role = role;
    partnerRepository.updateMemberRole(partnerId, userId, role).catch(() => {});
    return true;
  }

  getMembers(partnerId: string): PartnerMember[] {
    return this.members.get(partnerId) ?? [];
  }

  getMember(partnerId: string, userId: string): PartnerMember | undefined {
    return this.members.get(partnerId)?.find((m) => m.userId === userId);
  }

  assignWorkspace(
    partnerId: string, workspaceId: string, workspaceSlug: string, workspaceName: string,
    assignedBy: string, reason: PartnerWorkspace["reason"],
  ): { success: boolean; error?: string } {
    const partner = this.partners.get(partnerId);
    if (!partner) return { success: false, error: "Partner not found" };
    const assignments = this.workspaces.get(partnerId) ?? [];
    const activeAssignments = assignments.filter((w) => w.status === "active");
    const config = PARTNER_TYPES_CONFIG[partner.type];
    if (activeAssignments.length >= config.maxWorkspaces) {
      return { success: false, error: `Partner has reached max workspaces (${config.maxWorkspaces})` };
    }
    if (activeAssignments.some((w) => w.workspaceId === workspaceId)) {
      return { success: false, error: "Workspace already assigned to this partner" };
    }
    const assignment: PartnerWorkspace = {
      id: `${partnerId}_${workspaceId}`, partnerId, workspaceId, workspaceSlug, workspaceName,
      assignedAt: new Date().toISOString(), assignedBy, reason, status: "active",
    };
    assignments.push(assignment);
    this.workspaces.set(partnerId, assignments);
    partnerRepository.assignWorkspace(assignment).catch(() => {});
    this.addActivity(partnerId, { type: "workspace_assigned", description: `Workspace "${workspaceName}" assigned`, timestamp: assignment.assignedAt, relatedId: workspaceId });
    return { success: true };
  }

  unassignWorkspace(partnerId: string, workspaceId: string): { success: boolean; error?: string } {
    const assignments = this.workspaces.get(partnerId);
    if (!assignments) return { success: false, error: "Partner not found" };
    const assignment = assignments.find((w) => w.workspaceId === workspaceId && w.status === "active");
    if (!assignment) return { success: false, error: "Workspace not assigned to this partner" };
    assignment.status = "removed";
    partnerRepository.unassignWorkspace(partnerId, workspaceId).catch(() => {});
    this.addActivity(partnerId, { type: "workspace_assigned", description: `Workspace "${assignment.workspaceName}" unassigned`, timestamp: new Date().toISOString(), relatedId: workspaceId });
    return { success: true };
  }

  transferWorkspace(currentPartnerId: string, targetPartnerId: string, workspaceId: string, workspaceSlug: string, workspaceName: string, transferredBy: string): { success: boolean; error?: string } {
    const unassignResult = this.unassignWorkspace(currentPartnerId, workspaceId);
    if (!unassignResult.success) return unassignResult;
    const assignResult = this.assignWorkspace(targetPartnerId, workspaceId, workspaceSlug, workspaceName, transferredBy, "transferred");
    if (!assignResult.success) return assignResult;
    this.addActivity(currentPartnerId, { type: "workspace_transferred", description: `Workspace "${workspaceName}" transferred`, timestamp: new Date().toISOString(), relatedId: workspaceId });
    return { success: true };
  }

  getWorkspaces(partnerId: string): PartnerWorkspace[] {
    return this.workspaces.get(partnerId) ?? [];
  }

  getActiveWorkspaces(partnerId: string): PartnerWorkspace[] {
    return (this.workspaces.get(partnerId) ?? []).filter((w) => w.status === "active");
  }

  workspaceCount(partnerId: string): number {
    return this.getActiveWorkspaces(partnerId).length;
  }

  canManageWorkspace(partnerId: string, workspaceId: string): boolean {
    const assignments = this.workspaces.get(partnerId);
    if (!assignments) return false;
    return assignments.some((w) => w.workspaceId === workspaceId && w.status === "active");
  }

  remainingWorkspaceCapacity(partnerId: string): number {
    const partner = this.partners.get(partnerId);
    if (!partner) return 0;
    return Math.max(0, PARTNER_TYPES_CONFIG[partner.type].maxWorkspaces - this.workspaceCount(partnerId));
  }

  remainingClientCapacity(partnerId: string): number {
    const partner = this.partners.get(partnerId);
    if (!partner) return 0;
    return Math.max(0, PARTNER_TYPES_CONFIG[partner.type].maxClients - this.workspaceCount(partnerId));
  }

  checkOwnership(partnerId: string, workspaceId: string): OwnershipCheck {
    const partner = this.partners.get(partnerId);
    if (!partner) return { isOwner: false, partnerId: null, partnerType: null };
    const isOwner = this.canManageWorkspace(partnerId, workspaceId);
    return { isOwner, partnerId, partnerType: partner.type, capacity: { canAssign: !isOwner, remainingWorkspaces: this.remainingWorkspaceCapacity(partnerId), remainingClients: this.remainingClientCapacity(partnerId) } };
  }

  listManagedWorkspaces(partnerId: string): string[] {
    return this.getActiveWorkspaces(partnerId).map((w) => w.workspaceId);
  }

  createInvite(params: { partnerId: string; email: string; role: PartnerRole; invitedById: string; message?: string }): PartnerInvite | { error: string } {
    const partner = this.partners.get(params.partnerId);
    if (!partner) return { error: "Partner not found" };
    if (partner.status !== "active") return { error: "Partner is not active" };
    const existing = this.invites.get(params.partnerId) ?? [];
    if (existing.some((i) => i.email === params.email && i.status === "pending")) return { error: "An active invite already exists for this email" };
    const expiresAt = new Date(); expiresAt.setDate(expiresAt.getDate() + INVITE_TTL_DAYS);
    const invite: PartnerInvite = { id: `${params.partnerId}_${params.email}_${Date.now()}`, partnerId: params.partnerId, email: params.email, role: params.role, status: "pending", invitedById: params.invitedById, expiresAt: expiresAt.toISOString(), createdAt: new Date().toISOString(), message: params.message };
    existing.push(invite);
    this.invites.set(params.partnerId, existing);
    partnerRepository.createInvite({ id: invite.id, partnerId: invite.partnerId, email: invite.email, role: invite.role, invitedBy: invite.invitedById, expiresAt: invite.expiresAt, message: invite.message }).catch(() => {});
    this.addActivity(params.partnerId, { type: "invite_sent", description: `Invite sent to ${params.email}`, timestamp: invite.createdAt, relatedId: invite.id });
    return invite;
  }

  acceptInvite(inviteId: string, userId: string, userEmail: string): { success: boolean; error?: string; partnerId?: string } {
    const entries = Array.from(this.invites.entries());
    for (let i = 0; i < entries.length; i++) {
      const [partnerId, invites] = entries[i];
      const invite = invites.find((inv) => inv.id === inviteId);
      if (!invite) continue;
      if (invite.status !== "pending") return { success: false, error: `Invite is ${invite.status}` };
      if (invite.email !== userEmail) return { success: false, error: "Email mismatch" };
      if (new Date(invite.expiresAt) < new Date()) { invite.status = "expired"; return { success: false, error: "Invite has expired" }; }
      invite.status = "accepted";
      invite.acceptedById = userId;
      invite.acceptedAt = new Date().toISOString();
      this.addMember(partnerId, { id: `${partnerId}_${userId}`, partnerId, userId, role: invite.role, status: "active", joinedAt: new Date().toISOString() });
      this.addActivity(partnerId, { type: "invite_accepted", description: `${userEmail} accepted invite`, timestamp: invite.acceptedAt, relatedId: inviteId });
      return { success: true, partnerId };
    }
    return { success: false, error: "Invite not found" };
  }

  declineInvite(inviteId: string): { success: boolean; error?: string } {
    const values = Array.from(this.invites.values());
    for (let v = 0; v < values.length; v++) {
      const invites = values[v];
      const invite = invites.find((i) => i.id === inviteId);
      if (!invite) continue;
      if (invite.status !== "pending") return { success: false, error: `Invite is ${invite.status}` };
      invite.status = "declined";
      invite.declinedAt = new Date().toISOString();
      return { success: true };
    }
    return { success: false, error: "Invite not found" };
  }

  revokeInvite(partnerId: string, inviteId: string): { success: boolean; error?: string } {
    const invites = this.invites.get(partnerId);
    if (!invites) return { success: false, error: "Partner not found" };
    const invite = invites.find((i) => i.id === inviteId);
    if (!invite) return { success: false, error: "Invite not found" };
    if (invite.status !== "pending") return { success: false, error: `Invite is ${invite.status}` };
    invite.status = "revoked";
    invite.revokedAt = new Date().toISOString();
    return { success: true };
  }

  expireInvite(inviteId: string): { success: boolean; error?: string } {
    const values = Array.from(this.invites.values());
    for (let v = 0; v < values.length; v++) {
      const invites = values[v];
      const invite = invites.find((i) => i.id === inviteId);
      if (!invite) continue;
      invite.status = "expired";
      invite.expiredAt = new Date().toISOString();
      return { success: true };
    }
    return { success: false, error: "Invite not found" };
  }

  expireStaleInvites(): number {
    let count = 0; const now = new Date();
    const values = Array.from(this.invites.values());
    for (let v = 0; v < values.length; v++) {
      const invites = values[v];
      for (let i = 0; i < invites.length; i++) {
        const invite = invites[i];
        if (invite.status === "pending" && new Date(invite.expiresAt) < now) { invite.status = "expired"; invite.expiredAt = now.toISOString(); count++; }
      }
    }
    return count;
  }

  getInvites(partnerId: string): PartnerInvite[] { return this.invites.get(partnerId) ?? []; }
  getPendingInvites(partnerId: string): PartnerInvite[] { return (this.invites.get(partnerId) ?? []).filter((i) => i.status === "pending"); }

  getStatistics(partnerId: string): PartnerStatistics | null {
    const partner = this.partners.get(partnerId);
    if (!partner) return null;
    return toStatistics(this.getWorkspaces(partnerId), PARTNER_TYPES_CONFIG[partner.type], this.getPendingInvites(partnerId).length, this.getMembers(partnerId).length);
  }

  getActivity(partnerId: string, limit = 20): PartnerActivityItem[] { return (this.activityLog.get(partnerId) ?? []).slice(-limit); }

  private addActivity(partnerId: string, item: PartnerActivityItem): void {
    const log = this.activityLog.get(partnerId) ?? [];
    log.push(item);
    this.activityLog.set(partnerId, log);
  }
}

export const partnerEngine = new PartnerEngine();
