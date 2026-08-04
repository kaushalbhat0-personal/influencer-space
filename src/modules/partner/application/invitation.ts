/**
 * Creator invitation (IMPLEMENTATION-41) — passwordless, credential-free.
 * Agency provisions a creator → a token-based invitation is stored on the
 * tenant. The creator claims it with their OWN password (never generated or
 * shared by the agency) → becomes the workspace OWNER. Agency remains manager
 * via AgencyTenant + ClientAssignment + a MANAGER workspace membership.
 */
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { logAction } from "@/lib/audit";

export const CREATOR_INVITE_SETTING = "creator_invite";
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreatorInvite {
  token: string;
  email: string;
  creatorName: string;
  agencyId: string;
  tenantId: string;
  workspaceId: string | null;
  expiresAt: string;
  status: "pending" | "claimed" | "expired";
  createdBy: string;
}

export class CreatorInvitationService {
  async createInvitation(input: {
    agencyId: string;
    tenantId: string;
    workspaceId?: string | null;
    email: string;
    creatorName: string;
    createdBy: string;
  }): Promise<{ success: boolean; invite?: CreatorInvite; error?: string }> {
    const existing = await prisma.setting.findFirst({
      where: { tenantId: input.tenantId, key: CREATOR_INVITE_SETTING },
      select: { value: true },
    });
    const prev = existing?.value as unknown as CreatorInvite | undefined;
    // A pending, unexpired invitation blocks a new one; expired/claimed invites
    // may be re-issued (the agency can resend).
    if (prev && prev.status === "pending" && new Date(prev.expiresAt).getTime() > Date.now()) {
      return { success: false, error: "An invitation already exists for this creator" };
    }

    const token = randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
    const invite: CreatorInvite = {
      token,
      email: input.email,
      creatorName: input.creatorName,
      agencyId: input.agencyId,
      tenantId: input.tenantId,
      workspaceId: input.workspaceId ?? null,
      expiresAt: expiresAt.toISOString(),
      status: "pending",
      createdBy: input.createdBy,
    };

    await prisma.setting.upsert({
      where: { tenantId_key: { tenantId: input.tenantId, key: CREATOR_INVITE_SETTING } },
      update: { value: JSON.parse(JSON.stringify(invite)) },
      create: { tenantId: input.tenantId, key: CREATOR_INVITE_SETTING, value: JSON.parse(JSON.stringify(invite)) },
    });
    await logAction(input.tenantId, "partner:invitation-created", { agencyId: input.agencyId, email: input.email }).catch(() => {});
    return { success: true, invite };
  }

  async getPendingInvite(tenantId: string): Promise<CreatorInvite | null> {
    const setting = await prisma.setting.findUnique({
      where: { tenantId_key: { tenantId, key: CREATOR_INVITE_SETTING } },
    });
    if (!setting?.value) return null;
    const invite = setting.value as unknown as CreatorInvite;
    if (invite.status !== "pending") return null;
    if (new Date(invite.expiresAt).getTime() < Date.now()) {
      await this.markExpired(tenantId);
      return null;
    }
    return invite;
  }

  /**
   * Creator claims the invitation with their OWN password. Sets password,
   * activates membership as workspace OWNER, marks the invite claimed.
   */
  async claimInvitation(input: {
    token: string;
    email: string;
    password: string;
  }): Promise<{ success: boolean; error?: string; tenantId?: string }> {
    const settings = await prisma.setting.findMany({
      where: { key: CREATOR_INVITE_SETTING },
      select: { tenantId: true, value: true },
    });
    const setting = settings.find((s) => {
      const invite = s.value as unknown as CreatorInvite;
      return invite.token === input.token && invite.email.toLowerCase() === input.email.toLowerCase();
    });
    if (!setting) return { success: false, error: "Invitation not found" };
    const invite = setting.value as unknown as CreatorInvite;
    if (invite.status !== "pending") return { success: false, error: "Invitation already claimed" };
    if (new Date(invite.expiresAt).getTime() < Date.now()) return { success: false, error: "Invitation expired" };

    const password = await bcrypt.hash(input.password, 12);
    const [user, workspace] = await Promise.all([
      prisma.user.upsert({
        where: { email: input.email },
        update: { password, tenantId: invite.tenantId, agencyId: null, role: "ADMIN" },
        create: {
          email: input.email,
          name: invite.creatorName,
          password,
          tenantId: invite.tenantId,
          role: "ADMIN",
        },
      }),
      invite.workspaceId
        ? prisma.workspace.findUnique({ where: { id: invite.workspaceId } })
        : prisma.workspace.findUnique({ where: { tenantId: invite.tenantId } }),
    ]);

    if (workspace) {
      await prisma.workspaceMember.upsert({
        where: { workspaceId_userId: { workspaceId: workspace.id, userId: user.id } },
        update: { role: "OWNER", status: "ACTIVE" },
        create: { workspaceId: workspace.id, userId: user.id, role: "OWNER", status: "ACTIVE" },
      });
    }

    await prisma.setting.update({
      where: { tenantId_key: { tenantId: setting.tenantId, key: CREATOR_INVITE_SETTING } },
      data: { value: JSON.parse(JSON.stringify({ ...invite, status: "claimed", claimedAt: new Date().toISOString() })) },
    });
    await logAction(setting.tenantId, "partner:invitation-claimed", { email: input.email }).catch(() => {});
    return { success: true, tenantId: setting.tenantId };
  }

  private async markExpired(tenantId: string): Promise<void> {
    const setting = await prisma.setting.findUnique({ where: { tenantId_key: { tenantId, key: CREATOR_INVITE_SETTING } } });
    if (setting?.value) {
      const invite = setting.value as unknown as CreatorInvite;
      await prisma.setting.update({
        where: { tenantId_key: { tenantId, key: CREATOR_INVITE_SETTING } },
        data: { value: JSON.parse(JSON.stringify({ ...invite, status: "expired" })) },
      }).catch(() => {});
    }
  }
}

export const creatorInvitationService = new CreatorInvitationService();
