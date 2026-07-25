import { Organization, OrganizationType } from "../types";
import { OrganizationNotFoundError, WorkspaceNotFoundError } from "../errors";
import { IdentityEventDispatcher, createOrganizationCreatedEvent, createWorkspaceCreatedEvent } from "../events";
import { CreateOrganizationInput, UpdateOrganizationInput } from "./types";

export interface OrganizationRepository {
  findById(id: string): Promise<Organization | null>;
  findByOwner(ownerId: string): Promise<Organization[]>;
  create(input: CreateOrganizationInput): Promise<Organization>;
  update(id: string, input: UpdateOrganizationInput): Promise<Organization>;
  delete(id: string): Promise<void>;
}

export class OrganizationService {
  constructor(
    private readonly repository: OrganizationRepository,
    private readonly eventDispatcher: IdentityEventDispatcher
  ) {}

  async getOrganization(id: string): Promise<Organization> {
    const org = await this.repository.findById(id);
    if (!org) throw new OrganizationNotFoundError(id);
    return org;
  }

  async getOwnerOrganizations(ownerId: string): Promise<Organization[]> {
    return this.repository.findByOwner(ownerId);
  }

  async create(input: CreateOrganizationInput): Promise<Organization> {
    const org = await this.repository.create(input);

    this.eventDispatcher.emit(
      createOrganizationCreatedEvent(input.ownerId, org.id, input.ownerId, input.type)
    );

    return org;
  }

  async update(id: string, input: UpdateOrganizationInput): Promise<Organization> {
    await this.getOrganization(id);
    return this.repository.update(id, input);
  }

  async delete(id: string): Promise<void> {
    await this.getOrganization(id);
    await this.repository.delete(id);
  }
}
