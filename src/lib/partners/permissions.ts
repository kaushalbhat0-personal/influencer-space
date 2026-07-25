import type { PartnerRole } from "./constants";
import { PARTNER_ROLE_HIERARCHY } from "./constants";

export type PartnerPermission =
  | "partner:view"
  | "partner:edit"
  | "partner:delete"
  | "partner:change-type"
  | "partner:change-status"
  | "workspace:assign"
  | "workspace:unassign"
  | "workspace:transfer"
  | "workspace:view-all"
  | "members:invite"
  | "members:remove"
  | "members:change-role"
  | "invite:create"
  | "invite:revoke"
  | "invite:view-all"
  | "settings:read"
  | "settings:write"
  | "billing:read"
  | "billing:manage"
  | "analytics:view"
  | "audit:view";

const ROLE_PERMISSIONS: Record<PartnerRole, Set<PartnerPermission>> = {
  owner: new Set<PartnerPermission>([
    "partner:view", "partner:edit", "partner:delete", "partner:change-type", "partner:change-status",
    "workspace:assign", "workspace:unassign", "workspace:transfer", "workspace:view-all",
    "members:invite", "members:remove", "members:change-role",
    "invite:create", "invite:revoke", "invite:view-all",
    "settings:read", "settings:write",
    "billing:read", "billing:manage",
    "analytics:view",
    "audit:view",
  ]),
  admin: new Set<PartnerPermission>([
    "partner:view", "partner:edit",
    "workspace:assign", "workspace:unassign", "workspace:transfer", "workspace:view-all",
    "members:invite", "members:remove",
    "invite:create", "invite:revoke", "invite:view-all",
    "settings:read", "settings:write",
    "billing:read",
    "analytics:view",
    "audit:view",
  ]),
  manager: new Set<PartnerPermission>([
    "partner:view",
    "workspace:assign", "workspace:view-all",
    "members:invite",
    "invite:create",
    "settings:read",
    "analytics:view",
  ]),
  viewer: new Set<PartnerPermission>([
    "partner:view",
    "workspace:view-all",
    "settings:read",
    "analytics:view",
  ]),
};

export function hasPermission(role: PartnerRole, permission: PartnerPermission): boolean {
  return ROLE_PERMISSIONS[role]?.has(permission) ?? false;
}

export function roleAtLeast(role: PartnerRole, minimum: PartnerRole): boolean {
  return (PARTNER_ROLE_HIERARCHY[role] ?? 0) >= (PARTNER_ROLE_HIERARCHY[minimum] ?? 0);
}

export function getPermissionsForRole(role: PartnerRole): PartnerPermission[] {
  return Array.from(ROLE_PERMISSIONS[role] ?? []);
}

export function canManageRole(actorRole: PartnerRole, targetRole: PartnerRole): boolean {
  return PARTNER_ROLE_HIERARCHY[actorRole] > PARTNER_ROLE_HIERARCHY[targetRole];
}
