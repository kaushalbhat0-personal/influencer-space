import { IdentityWorkspace, WorkspaceStatus, WorkspaceType } from "../types";
import { WorkspaceNotFoundError } from "../errors";
import { IdentityEventDispatcher, createWorkspaceCreatedEvent, createMembershipCreatedEvent } from "../events";
import { CreateWorkspaceInput, UpdateWorkspaceInput, WorkspaceQuery } from "./types";

export interface WorkspaceRepository {
  findById(id: string): Promise<IdentityWorkspace | null>;
  findBySlug(slug: string): Promise<IdentityWorkspace | null>;
  findByOrganization(organizationId: string): Promise<IdentityWorkspace[]>;
  findByUser(userId: string): Promise<IdentityWorkspace[]>;
  create(input: CreateWorkspaceInput): Promise<IdentityWorkspace>;
  update(id: string, input: UpdateWorkspaceInput): Promise<IdentityWorkspace>;
  updateStatus(id: string, status: WorkspaceStatus): Promise<void>;
}

export class WorkspaceService {
  constructor(
    private readonly repository: WorkspaceRepository,
    private readonly eventDispatcher: IdentityEventDispatcher
  ) {}

  async getWorkspace(id: string): Promise<IdentityWorkspace> {
    const workspace = await this.repository.findById(id);
    if (!workspace) throw new WorkspaceNotFoundError(id);
    return workspace;
  }

  async getWorkspaceBySlug(slug: string): Promise<IdentityWorkspace | null> {
    return this.repository.findBySlug(slug);
  }

  async getOrganizationWorkspaces(organizationId: string): Promise<IdentityWorkspace[]> {
    return this.repository.findByOrganization(organizationId);
  }

  async getUserWorkspaces(userId: string): Promise<IdentityWorkspace[]> {
    return this.repository.findByUser(userId);
  }

  async create(input: CreateWorkspaceInput): Promise<IdentityWorkspace> {
    const workspace = await this.repository.create(input);

    this.eventDispatcher.emit(
      createWorkspaceCreatedEvent(input.ownerUserId, workspace.id, input.organizationId, input.type)
    );

    this.eventDispatcher.emit(
      createMembershipCreatedEvent(input.ownerUserId, input.ownerUserId, workspace.id, "owner")
    );

    return workspace;
  }

  async update(id: string, input: UpdateWorkspaceInput): Promise<IdentityWorkspace> {
    await this.getWorkspace(id);
    return this.repository.update(id, input);
  }

  async updateStatus(id: string, status: WorkspaceStatus): Promise<void> {
    await this.getWorkspace(id);
    await this.repository.updateStatus(id, status);
  }

  async query(query: WorkspaceQuery): Promise<IdentityWorkspace[]> {
    if (query.userId) {
      const workspaces = await this.repository.findByUser(query.userId);
      return workspaces.filter((w) => {
        if (query.type && w.type !== query.type) return false;
        if (query.status && w.status !== query.status) return false;
        return true;
      });
    }
    return [];
  }
}
