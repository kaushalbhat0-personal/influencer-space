import { WorkspaceInvitation, InvitationStatus } from "../types";
import { InvitationNotFoundError, InvitationExpiredError } from "../errors";
import { IdentityEventDispatcher, createInvitationSentEvent, createInvitationAcceptedEvent } from "../events";
import { SendInvitationInput } from "./types";
import { DEFAULT_IDENTITY_CONFIG } from "../types";
import crypto from "crypto";

export interface InvitationRepository {
  findById(id: string): Promise<WorkspaceInvitation | null>;
  findByToken(token: string): Promise<WorkspaceInvitation | null>;
  findByWorkspace(workspaceId: string): Promise<WorkspaceInvitation[]>;
  findByEmail(email: string): Promise<WorkspaceInvitation[]>;
  create(input: WorkspaceInvitation): Promise<WorkspaceInvitation>;
  updateStatus(id: string, status: InvitationStatus, acceptedAt?: Date): Promise<void>;
  delete(id: string): Promise<void>;
}

export class InvitationService {
  constructor(
    private readonly repository: InvitationRepository,
    private readonly eventDispatcher: IdentityEventDispatcher
  ) {}

  async getInvitation(id: string): Promise<WorkspaceInvitation> {
    const invitation = await this.repository.findById(id);
    if (!invitation) throw new InvitationNotFoundError();
    return invitation;
  }

  async getWorkspaceInvitations(workspaceId: string): Promise<WorkspaceInvitation[]> {
    return this.repository.findByWorkspace(workspaceId);
  }

  async send(input: SendInvitationInput): Promise<WorkspaceInvitation> {
    const expiresAt = input.expiresAt ?? new Date(
      Date.now() + DEFAULT_IDENTITY_CONFIG.invitationExpiresInHours * 60 * 60 * 1000
    );

    const invitation: WorkspaceInvitation = {
      id: crypto.randomUUID(),
      workspaceId: input.workspaceId,
      email: input.email.toLowerCase(),
      role: input.role,
      token: crypto.randomBytes(32).toString("hex"),
      invitedByUserId: input.invitedByUserId,
      status: "pending",
      expiresAt,
      acceptedAt: null,
      createdAt: new Date(),
    };

    const created = await this.repository.create(invitation);

    this.eventDispatcher.emit(
      createInvitationSentEvent(
        input.invitedByUserId,
        created.id,
        input.workspaceId,
        input.email,
        input.role
      )
    );

    return created;
  }

  async accept(token: string, userId: string): Promise<WorkspaceInvitation> {
    const invitation = await this.repository.findByToken(token);
    if (!invitation) throw new InvitationNotFoundError();

    if (invitation.status === "expired" || invitation.expiresAt < new Date()) {
      await this.repository.updateStatus(invitation.id, "expired");
      throw new InvitationExpiredError();
    }

    if (invitation.status !== "pending") {
      throw new InvitationNotFoundError();
    }

    await this.repository.updateStatus(invitation.id, "accepted", new Date());
    const updated = (await this.repository.findById(invitation.id))!;

    this.eventDispatcher.emit(
      createInvitationAcceptedEvent(userId, invitation.id, userId, invitation.workspaceId)
    );

    return updated;
  }

  async revoke(id: string): Promise<void> {
    await this.getInvitation(id);
    await this.repository.updateStatus(id, "revoked");
  }

  async expire(id: string): Promise<void> {
    await this.getInvitation(id);
    await this.repository.updateStatus(id, "expired");
  }

  async validate(token: string): Promise<{ isValid: boolean; reason?: string; invitation?: WorkspaceInvitation }> {
    const invitation = await this.repository.findByToken(token);
    if (!invitation) {
      return { isValid: false, reason: "Invitation not found" };
    }
    if (invitation.status !== "pending") {
      return { isValid: false, reason: `Invitation is ${invitation.status}` };
    }
    if (invitation.expiresAt < new Date()) {
      await this.repository.updateStatus(invitation.id, "expired");
      return { isValid: false, reason: "Invitation has expired" };
    }
    return { isValid: true, invitation };
  }
}
