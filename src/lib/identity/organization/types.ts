import { Organization, OrganizationType } from "../types";

export interface CreateOrganizationInput {
  readonly name: string;
  readonly type: OrganizationType;
  readonly ownerId: string;
}

export interface UpdateOrganizationInput {
  readonly name?: string;
  readonly type?: OrganizationType;
}

export type { Organization, OrganizationType };
