import { IdentityWorkspace, WorkspaceType, WorkspaceStatus, WorkspaceRole } from "../types";

export interface CreateWorkspaceInput {
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: WorkspaceType;
  readonly ownerUserId: string;
  readonly isFreelancer?: boolean;
}

export interface UpdateWorkspaceInput {
  readonly name?: string;
  readonly status?: WorkspaceStatus;
  readonly isFreelancer?: boolean;
  readonly onboardingCompleted?: boolean;
}

export interface WorkspaceSettings {
  readonly workspaceId: string;
  readonly timezone: string;
  readonly locale: string;
  readonly defaultBrandColors: Record<string, string>;
  readonly branding: {
    readonly logoUrl: string | null;
    readonly faviconUrl: string | null;
  };
  readonly features: string[];
}

export interface WorkspaceQuery {
  readonly userId?: string;
  readonly type?: WorkspaceType;
  readonly status?: WorkspaceStatus;
}

export type { IdentityWorkspace };
