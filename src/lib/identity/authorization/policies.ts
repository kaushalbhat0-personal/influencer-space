import { ResourcePolicy } from "../types";

export const RESOURCE_POLICIES: readonly ResourcePolicy[] = Object.freeze([
  {
    resourceType: "content",
    ownerField: "userId",
    workspaceField: "workspaceId",
  },
  {
    resourceType: "campaign",
    ownerField: "userId",
    workspaceField: "workspaceId",
  },
  {
    resourceType: "analytics_report",
    ownerField: "workspaceId",
    workspaceField: "workspaceId",
  },
  {
    resourceType: "brand",
    ownerField: "userId",
    workspaceField: "workspaceId",
  },
  {
    resourceType: "invoice",
    ownerField: "workspaceId",
    workspaceField: "workspaceId",
  },
  {
    resourceType: "template",
    ownerField: "workspaceId",
    workspaceField: "workspaceId",
  },
]);

export function getResourcePolicy(resourceType: string): ResourcePolicy | undefined {
  return RESOURCE_POLICIES.find((p) => p.resourceType === resourceType);
}

export function validateWorkspaceScope(
  resourceType: string,
  resource: Record<string, unknown>,
  workspaceId: string
): boolean {
  const policy = getResourcePolicy(resourceType);
  if (!policy) return false;
  return resource[policy.workspaceField] === workspaceId;
}

export function validateOwnership(
  resourceType: string,
  resource: Record<string, unknown>,
  userId: string
): boolean {
  const policy = getResourcePolicy(resourceType);
  if (!policy) return true;
  return resource[policy.ownerField] === userId;
}
