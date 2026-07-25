import { RoleDefinition, PlatformRole } from "../types";

export const SYSTEM_ROLES: readonly RoleDefinition[] = Object.freeze([
  {
    name: "Super Admin",
    platformRole: "super_admin",
    permissions: Object.freeze([
      "platform:read", "platform:write", "platform:delete", "platform:admin",
      "platform:billing:read", "platform:billing:write",
      "platform:analytics:read",
      "platform:users:read", "platform:users:write", "platform:users:delete",
      "platform:workspaces:read", "platform:workspaces:write", "platform:workspaces:delete",
      "platform:audit:read",
      "workspace:read", "workspace:write", "workspace:delete",
      "workspace:members:read", "workspace:members:write", "workspace:members:delete",
      "workspace:billing:read", "workspace:billing:write",
      "workspace:content:read", "workspace:content:write",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Full platform access with all permissions",
  },
  {
    name: "Agency Admin",
    platformRole: "agency_admin",
    permissions: Object.freeze([
      "platform:read",
      "platform:analytics:read",
      "platform:users:read",
      "workspace:read", "workspace:write",
      "workspace:members:read", "workspace:members:write", "workspace:members:delete",
      "workspace:billing:read", "workspace:billing:write",
      "workspace:content:read", "workspace:content:write",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Agency workspace administration and client management",
  },
  {
    name: "Agency Member",
    platformRole: "agency_member",
    permissions: Object.freeze([
      "platform:read",
      "platform:analytics:read",
      "workspace:read",
      "workspace:members:read",
      "workspace:billing:read",
      "workspace:content:read", "workspace:content:write",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Agency team member with content and analytics access",
  },
  {
    name: "Creator Owner",
    platformRole: "creator_owner",
    permissions: Object.freeze([
      "platform:read",
      "workspace:read", "workspace:write",
      "workspace:members:read", "workspace:members:write",
      "workspace:billing:read",
      "workspace:content:read", "workspace:content:write",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Creator workspace owner with full workspace control",
  },
  {
    name: "Creator Member",
    platformRole: "creator_member",
    permissions: Object.freeze([
      "platform:read",
      "workspace:read",
      "workspace:members:read",
      "workspace:content:read", "workspace:content:write",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Creator team member with content and analytics access",
  },
  {
    name: "Viewer",
    platformRole: "viewer",
    permissions: Object.freeze([
      "platform:read",
      "workspace:read",
      "workspace:members:read",
      "workspace:content:read",
      "workspace:analytics:read",
    ]),
    isSystem: true,
    description: "Read-only access to workspace resources",
  },
]);

export class RoleRegistry {
  private readonly roles: Map<PlatformRole, RoleDefinition> = new Map();

  constructor() {
    for (const role of SYSTEM_ROLES) {
      this.roles.set(role.platformRole, role);
    }
  }

  getRole(platformRole: PlatformRole): RoleDefinition | undefined {
    return this.roles.get(platformRole);
  }

  hasPermission(platformRole: PlatformRole, permission: string): boolean {
    const role = this.roles.get(platformRole);
    if (!role) return false;
    return role.permissions.includes(permission);
  }

  hasAnyPermission(platformRole: PlatformRole, permissions: readonly string[]): boolean {
    const role = this.roles.get(platformRole);
    if (!role) return false;
    return permissions.some((p) => role.permissions.includes(p));
  }

  hasAllPermissions(platformRole: PlatformRole, permissions: readonly string[]): boolean {
    const role = this.roles.get(platformRole);
    if (!role) return false;
    return permissions.every((p) => role.permissions.includes(p));
  }

  listRoles(): readonly RoleDefinition[] {
    return Array.from(this.roles.values());
  }

  getPermissionsForRole(platformRole: PlatformRole): readonly string[] {
    const role = this.roles.get(platformRole);
    return role ? role.permissions : [];
  }

  registerRole(role: RoleDefinition): void {
    if (this.roles.has(role.platformRole)) {
      throw new Error(`Role "${role.platformRole}" is already registered`);
    }
    this.roles.set(role.platformRole, Object.freeze({ ...role }));
  }
}
