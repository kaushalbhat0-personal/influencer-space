import { WorkspaceMember, WorkspaceRole, IdentityUser } from "../types";

export interface CreateMembershipInput {
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly invitedAt?: Date;
}

export interface UpdateMembershipInput {
  readonly role: WorkspaceRole;
}

export interface MembershipWithUser extends WorkspaceMember {
  readonly user: IdentityUser;
}

export type { WorkspaceMember, WorkspaceRole };
