import { WorkspaceInvitation, WorkspaceRole, InvitationStatus } from "../types";

export interface SendInvitationInput {
  readonly workspaceId: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly invitedByUserId: string;
  readonly expiresAt?: Date;
}

export interface InvitationValidation {
  readonly isValid: boolean;
  readonly reason?: string;
}

export type { WorkspaceInvitation, InvitationStatus, WorkspaceRole };
