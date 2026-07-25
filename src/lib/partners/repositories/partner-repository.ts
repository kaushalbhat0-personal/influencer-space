import { prisma } from "@/lib/prisma";
import type { Partner } from "../types";
import type { PartnerType, PartnerStatus } from "../constants";

async function db<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export class PartnerRepository {
  async create(data: { id: string; type: PartnerType; businessName: string; country?: string; timezone?: string }): Promise<Partner> {
    return db(async () => { const r = await prisma.partner.create({ data: { id: data.id, type: data.type, businessName: data.businessName, country: data.country, timezone: data.timezone } }); return this.toDomain(r); }, null as unknown as Partner);
  }

  async get(id: string): Promise<Partner | undefined> {
    return db(async () => { const r = await prisma.partner.findUnique({ where: { id } }); return r ? this.toDomain(r) : undefined; }, undefined);
  }

  async setStatus(id: string, status: PartnerStatus): Promise<Partner | undefined> {
    return db(async () => { const r = await prisma.partner.update({ where: { id }, data: { status } }); return this.toDomain(r); }, undefined);
  }

  async updateProfile(id: string, profile: Partial<Partner["profile"]>): Promise<Partner | undefined> {
    return db(async () => {
      const r = await prisma.partner.update({ where: { id }, data: { businessName: profile.businessName, country: profile.country, timezone: profile.timezone, supportEmail: profile.supportEmail, website: profile.website, description: profile.description, taxIdentifier: profile.taxIdentifier, contactPerson: profile.contactPerson, socialLinks: profile.socialLinks ?? undefined } });
      return this.toDomain(r);
    }, undefined);
  }

  async list(): Promise<Partner[]> {
    return db(async () => { const records = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } }); return records.map((r) => this.toDomain(r)); }, []);
  }

  async addMember(partnerId: string, member: { id: string; userId: string; role: string; status: string; joinedAt: string }): Promise<boolean> {
    return db(async () => {
      if (await prisma.partnerMember.findUnique({ where: { partnerId_userId: { partnerId, userId: member.userId } } })) return false;
      await prisma.partnerMember.create({ data: { id: member.id, partnerId, userId: member.userId, role: member.role, status: member.status, joinedAt: new Date(member.joinedAt) } });
      return true;
    }, false);
  }

  async removeMember(partnerId: string, userId: string): Promise<boolean> {
    return db(async () => { const r = await prisma.partnerMember.deleteMany({ where: { partnerId, userId } }); return r.count > 0; }, false);
  }

  async updateMemberRole(partnerId: string, userId: string, role: string): Promise<boolean> {
    return db(async () => { const r = await prisma.partnerMember.updateMany({ where: { partnerId, userId }, data: { role } }); return r.count > 0; }, false);
  }

  async getMembers(partnerId: string): Promise<Array<{ id: string; userId: string; role: string; status: string; joinedAt: string }>> {
    return db(async () => { const records = await prisma.partnerMember.findMany({ where: { partnerId }, orderBy: { joinedAt: "asc" } }); return records.map((r) => ({ id: r.id, userId: r.userId, role: r.role, status: r.status, joinedAt: r.joinedAt.toISOString() })); }, []);
  }

  async assignWorkspace(data: { id: string; partnerId: string; workspaceId: string; workspaceSlug: string; workspaceName: string; assignedBy: string; reason: string }): Promise<boolean> {
    return db(async () => {
      if (await prisma.partnerWorkspaceAssignment.findUnique({ where: { workspaceId: data.workspaceId } })) return false;
      await prisma.partnerWorkspaceAssignment.create({ data });
      return true;
    }, false);
  }

  async getWorkspaceAssignments(partnerId: string): Promise<Array<{ id: string; workspaceId: string; workspaceName: string; workspaceSlug: string | null; status: string; reason: string; assignedBy: string; assignedAt: string }>> {
    return db(async () => { const records = await prisma.partnerWorkspaceAssignment.findMany({ where: { partnerId }, orderBy: { assignedAt: "desc" } }); return records.map((r) => ({ id: r.id, workspaceId: r.workspaceId, workspaceName: r.workspaceName, workspaceSlug: r.workspaceSlug, status: r.status, reason: r.reason, assignedBy: r.assignedBy, assignedAt: r.assignedAt.toISOString() })); }, []);
  }

  async unassignWorkspace(partnerId: string, workspaceId: string): Promise<boolean> {
    return db(async () => { const r = await prisma.partnerWorkspaceAssignment.updateMany({ where: { partnerId, workspaceId, status: "active" }, data: { status: "removed", removedAt: new Date() } }); return r.count > 0; }, false);
  }

  async createInvite(data: { id: string; partnerId: string; email: string; role: string; invitedBy: string; expiresAt: string; message?: string }): Promise<boolean> {
    return db(async () => { await prisma.partnerInvite.create({ data: { ...data, expiresAt: new Date(data.expiresAt) } }); return true; }, false);
  }

  async getInvites(partnerId: string): Promise<Array<{ id: string; email: string; role: string; status: string; invitedBy: string; createdAt: string; expiresAt: string; message?: string | null }>> {
    return db(async () => { const records = await prisma.partnerInvite.findMany({ where: { partnerId }, orderBy: { createdAt: "desc" } }); return records.map((r) => ({ id: r.id, email: r.email, role: r.role, status: r.status, invitedBy: r.invitedBy, createdAt: r.createdAt.toISOString(), expiresAt: r.expiresAt.toISOString(), message: r.message })); }, []);
  }

  async updateInviteStatus(inviteId: string, status: string, extra?: Record<string, string>): Promise<boolean> {
    return db(async () => {
      const data: Record<string, unknown> = { status };
      if (extra?.acceptedAt) data.acceptedAt = new Date(extra.acceptedAt);
      if (extra?.declinedAt) data.declinedAt = new Date(extra.declinedAt);
      if (extra?.revokedAt) data.revokedAt = new Date(extra.revokedAt);
      if (extra?.expiredAt) data.expiredAt = new Date(extra.expiredAt);
      if (extra?.acceptedBy) data.acceptedBy = extra.acceptedBy;
      const r = await prisma.partnerInvite.updateMany({ where: { id: inviteId }, data });
      return r.count > 0;
    }, false);
  }

  private toDomain(record: { id: string; type: string; status: string; businessName: string; logo: string | null; website: string | null; description: string | null; taxIdentifier: string | null; country: string | null; timezone: string | null; supportEmail: string | null; contactPerson: string | null; socialLinks: unknown; settings: unknown; createdAt: Date; updatedAt: Date }): Partner {
    return { id: record.id, type: record.type as PartnerType, status: record.status as PartnerStatus, profile: { businessName: record.businessName, logo: record.logo ?? undefined, website: record.website ?? undefined, description: record.description ?? undefined, taxIdentifier: record.taxIdentifier ?? undefined, country: record.country ?? undefined, timezone: record.timezone ?? undefined, supportEmail: record.supportEmail ?? undefined, contactPerson: record.contactPerson ?? undefined, socialLinks: record.socialLinks as Record<string, string> | undefined }, settings: record.settings as Partner["settings"], createdAt: record.createdAt.toISOString(), updatedAt: record.updatedAt.toISOString() };
  }
}

export const partnerRepository = new PartnerRepository();
