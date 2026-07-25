import { WorkspaceMember, WorkspaceRole } from "../types";
import { MembershipNotFoundError } from "../errors";
import { IdentityEventDispatcher, createMembershipCreatedEvent, createMembershipRoleChangedEvent, createMembershipRemovedEvent } from "../events";
import { CreateMembershipInput, UpdateMembershipInput, MembershipWithUser } from "./types";

export interface MembershipRepository {
  findById(id: string): Promise<WorkspaceMember | null>;
  findByWorkspace(workspaceId: string): Promise<MembershipWithUser[]>;
  findByUser(userId: string): Promise<WorkspaceMember[]>;
  find(workspaceId: string, userId: string): Promise<WorkspaceMember | null>;
  create(input: CreateMembershipInput): Promise<WorkspaceMember>;
  update(id: string, input: UpdateMembershipInput): Promise<WorkspaceMember>;
  delete(id: string): Promise<void>;
}

export class MembershipService {
  constructor(
    private readonly repository: MembershipRepository,
    private readonly eventDispatcher: IdentityEventDispatcher
  ) {}

  async getMembership(id: string): Promise<WorkspaceMember> {
    const membership = await this.repository.findById(id);
    if (!membership) throw new MembershipNotFoundError();
    return membership;
  }

  async getWorkspaceMembers(workspaceId: string): Promise<MembershipWithUser[]> {
    return this.repository.findByWorkspace(workspaceId);
  }

  async getUserMemberships(userId: string): Promise<WorkspaceMember[]> {
    return this.repository.findByUser(userId);
  }

  async findMembership(workspaceId: string, userId: string): Promise<WorkspaceMember | null> {
    return this.repository.find(workspaceId, userId);
  }

  async addMember(actorId: string, input: CreateMembershipInput): Promise<WorkspaceMember> {
    const membership = await this.repository.create(input);

    this.eventDispatcher.emit(
      createMembershipCreatedEvent(actorId, input.userId, input.workspaceId, input.role)
    );

    return membership;
  }

  async changeRole(actorId: string, membershipId: string, newRole: WorkspaceRole): Promise<WorkspaceMember> {
    const existing = await this.getMembership(membershipId);
    const previousRole = existing.role;

    const updated = await this.repository.update(membershipId, { role: newRole });

    this.eventDispatcher.emit(
      createMembershipRoleChangedEvent(actorId, existing.userId, existing.workspaceId, previousRole, newRole)
    );

    return updated;
  }

  async removeMember(actorId: string, membershipId: string): Promise<void> {
    const existing = await this.getMembership(membershipId);
    await this.repository.delete(membershipId);

    this.eventDispatcher.emit(
      createMembershipRemovedEvent(actorId, existing.userId, existing.workspaceId)
    );
  }

  async getUserRole(workspaceId: string, userId: string): Promise<WorkspaceRole | null> {
    const membership = await this.repository.find(workspaceId, userId);
    return membership?.role ?? null;
  }
}
