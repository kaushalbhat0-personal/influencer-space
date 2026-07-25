import { describe, it, expect, vi } from "vitest";
import { RoleRegistry, SYSTEM_ROLES } from "@/lib/identity/roles/registry";
import { IdentityEventDispatcher } from "@/lib/identity/events";
import { createUserCreatedEvent, createMembershipCreatedEvent, createMembershipRoleChangedEvent, createMembershipRemovedEvent, createInvitationSentEvent, createInvitationAcceptedEvent, createSessionCreatedEvent, createSessionRevokedEvent, createWorkspaceCreatedEvent, createOrganizationCreatedEvent, createUserLoginEvent } from "@/lib/identity/events";
import { AuthorizationService } from "@/lib/identity/authorization/service";
import { SessionService } from "@/lib/identity/session/service";
import { InvitationService } from "@/lib/identity/invitation/service";
import { MembershipService } from "@/lib/identity/membership/service";
import { WorkspaceService } from "@/lib/identity/workspace/service";
import { OrganizationService } from "@/lib/identity/organization/service";
import { AuthenticationService } from "@/lib/identity/authentication/service";
import {
  AuthenticationError, AuthorizationError, UserNotFoundError,
  UserAlreadyExistsError, EmailNotVerifiedError, SessionExpiredError,
  SessionRevokedError, InvalidTokenError, WorkspaceNotFoundError,
  MembershipNotFoundError, InvitationNotFoundError, InvitationExpiredError,
  OrganizationNotFoundError, AccountLockedError, ResourceOwnershipError,
  TenantIsolationError,
} from "@/lib/identity/errors";
import {
  DEFAULT_IDENTITY_CONFIG, type PlatformRole, type WorkspaceRole,
  type IdentityUser, type IdentitySession, type WorkspaceMember,
  type WorkspaceInvitation, type IdentityWorkspace, type Organization,
} from "@/lib/identity/types";
import { getResourcePolicy, validateWorkspaceScope, validateOwnership } from "@/lib/identity/authorization/policies";

describe("RoleRegistry", () => {
  it("should initialize with all system roles", () => {
    const registry = new RoleRegistry();
    expect(registry.listRoles().length).toBe(SYSTEM_ROLES.length);
  });

  it("should get a role by platformRole", () => {
    const registry = new RoleRegistry();
    const role = registry.getRole("super_admin");
    expect(role).toBeDefined();
    expect(role!.name).toBe("Super Admin");
  });

  it("should return undefined for unknown role", () => {
    const registry = new RoleRegistry();
    expect(registry.getRole("unknown" as PlatformRole)).toBeUndefined();
  });

  it("should check permissions correctly", () => {
    const registry = new RoleRegistry();
    expect(registry.hasPermission("super_admin", "platform:delete")).toBe(true);
    expect(registry.hasPermission("viewer", "platform:delete")).toBe(false);
  });

  it("should check any permission", () => {
    const registry = new RoleRegistry();
    expect(registry.hasAnyPermission("agency_admin", ["platform:write", "platform:read"])).toBe(true);
    expect(registry.hasAnyPermission("viewer", ["platform:write", "platform:delete"])).toBe(false);
  });

  it("should check all permissions", () => {
    const registry = new RoleRegistry();
    expect(registry.hasAllPermissions("super_admin", ["platform:read", "platform:write"])).toBe(true);
    expect(registry.hasAllPermissions("viewer", ["platform:read", "platform:write"])).toBe(false);
  });

  it("should register a custom role", () => {
    const registry = new RoleRegistry();
    expect(() => {
      registry.registerRole({
        name: "Custom Role",
        platformRole: "custom_role" as PlatformRole,
        permissions: ["custom:read"],
        isSystem: false,
        description: "A custom role for testing",
      });
    }).not.toThrow();
    const role = registry.getRole("custom_role" as PlatformRole);
    expect(role).toBeDefined();
    expect(role!.name).toBe("Custom Role");
  });

  it("should throw on duplicate registration", () => {
    const registry = new RoleRegistry();
    expect(() => {
      registry.registerRole({
        name: "Duplicate",
        platformRole: "super_admin",
        permissions: [],
        isSystem: false,
        description: "Duplicate",
      });
    }).toThrow("already registered");
  });

  it("should get permissions for a role", () => {
    const registry = new RoleRegistry();
    const perms = registry.getPermissionsForRole("viewer");
    expect(perms.length).toBeGreaterThan(0);
    expect(perms).toContain("platform:read");
  });

  it("should return empty array for unknown role", () => {
    const registry = new RoleRegistry();
    const perms = registry.getPermissionsForRole("unknown" as PlatformRole);
    expect(perms.length).toBe(0);
  });
});

describe("IdentityEventDispatcher", () => {
  it("should emit and handle events", () => {
    const dispatcher = new IdentityEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("identity:user:created", handler);

    const event = createUserCreatedEvent("actor-1", "user-1", "test@test.com", "email");
    dispatcher.emit(event);

    expect(handler).toHaveBeenCalledWith(event);
  });

  it("should remove listener via returned function", () => {
    const dispatcher = new IdentityEventDispatcher();
    const handler = vi.fn();
    const off = dispatcher.on("identity:user:created", handler);
    off();

    dispatcher.emit(createUserCreatedEvent("actor-1", "user-1", "test@test.com", "email"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("should not crash when emitting unregistered event type", () => {
    const dispatcher = new IdentityEventDispatcher();
    expect(() => {
      dispatcher.emit(createUserCreatedEvent("actor-1", "user-1", "t@t.com", "email"));
    }).not.toThrow();
  });

  it("should handle multiple listeners for same event", () => {
    const dispatcher = new IdentityEventDispatcher();
    const h1 = vi.fn();
    const h2 = vi.fn();
    dispatcher.on("identity:user:created", h1);
    dispatcher.on("identity:user:created", h2);

    dispatcher.emit(createUserCreatedEvent("actor-1", "user-1", "t@t.com", "email"));
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it("should throw when listener throws", () => {
    const dispatcher = new IdentityEventDispatcher();
    const h1 = vi.fn(() => { throw new Error("listener error"); });
    dispatcher.on("identity:user:created", h1);

    expect(() => {
      dispatcher.emit(createUserCreatedEvent("actor-1", "user-1", "t@t.com", "email"));
    }).toThrow("listener error");
  });

  it("should not call listeners after removeAll", () => {
    const dispatcher = new IdentityEventDispatcher();
    const handler = vi.fn();
    dispatcher.on("identity:user:created", handler);
    dispatcher.removeAll();
    dispatcher.emit(createUserCreatedEvent("actor-1", "user-1", "t@t.com", "email"));
    expect(handler).not.toHaveBeenCalled();
  });

  it("should create user created event with correct shape", () => {
    const event = createUserCreatedEvent("actor-1", "user-1", "test@test.com", "email");
    expect(event.type).toBe("identity:user:created");
    expect(event.actorId).toBe("actor-1");
    expect(event.payload.userId).toBe("user-1");
    expect(event.payload.email).toBe("test@test.com");
    expect(event.timestamp).toBeInstanceOf(Date);
  });

  it("should freeze event and payload", () => {
    const event = createUserCreatedEvent("actor-1", "user-1", "t@t.com", "email");
    expect(Object.isFrozen(event)).toBe(true);
    expect(Object.isFrozen(event.payload)).toBe(true);
  });

  it("should create membership created event", () => {
    const event = createMembershipCreatedEvent("actor-1", "user-1", "ws-1", "member");
    expect(event.type).toBe("identity:membership:created");
    expect(event.payload.workspaceId).toBe("ws-1");
  });

  it("should create membership role changed event", () => {
    const event = createMembershipRoleChangedEvent("actor-1", "user-1", "ws-1", "member", "admin");
    expect(event.type).toBe("identity:membership:role-changed");
    expect(event.payload.previousRole).toBe("member");
    expect(event.payload.newRole).toBe("admin");
  });

  it("should create membership removed event", () => {
    const event = createMembershipRemovedEvent("actor-1", "user-1", "ws-1");
    expect(event.type).toBe("identity:membership:removed");
    expect(event.payload.userId).toBe("user-1");
    expect(event.payload.workspaceId).toBe("ws-1");
  });

  it("should create invitation sent event", () => {
    const event = createInvitationSentEvent("actor-1", "inv-1", "ws-1", "test@test.com", "member");
    expect(event.type).toBe("identity:invitation:sent");
  });

  it("should create invitation accepted event", () => {
    const event = createInvitationAcceptedEvent("user-1", "inv-1", "user-1", "ws-1");
    expect(event.type).toBe("identity:invitation:accepted");
  });

  it("should create session created event", () => {
    const event = createSessionCreatedEvent("actor-1", "user-1", "sess-1");
    expect(event.type).toBe("identity:session:created");
  });

  it("should create session revoked event", () => {
    const event = createSessionRevokedEvent("actor-1", "user-1", "sess-1", "logout");
    expect(event.type).toBe("identity:session:revoked");
    expect(event.payload.reason).toBe("logout");
  });

  it("should create workspace created event", () => {
    const event = createWorkspaceCreatedEvent("actor-1", "ws-1", "org-1", "creator");
    expect(event.type).toBe("identity:workspace:created");
  });

  it("should create organization created event", () => {
    const event = createOrganizationCreatedEvent("actor-1", "org-1", "user-1", "individual");
    expect(event.type).toBe("identity:organization:created");
  });

  it("should create user login event", () => {
    const event = createUserLoginEvent("actor-1", "user-1", "sess-1", "127.0.0.1");
    expect(event.type).toBe("identity:user:login");
    expect(event.payload.ipAddress).toBe("127.0.0.1");
  });
});

describe("AuthorizationService", () => {
  const registry = new RoleRegistry();
  const authz = new AuthorizationService(registry);

  const superAdminCtx = { userId: "u1", platformRole: "super_admin" as PlatformRole, workspaceRole: "owner" as WorkspaceRole, workspaceId: "ws-1" };
  const viewerCtx = { userId: "u2", platformRole: "viewer" as PlatformRole, workspaceRole: "viewer" as WorkspaceRole, workspaceId: "ws-1" };
  const otherWorkspaceCtx = { userId: "u3", platformRole: "creator_owner" as PlatformRole, workspaceRole: "owner" as WorkspaceRole, workspaceId: "ws-2" };

  it("should allow super_admin to do anything", () => {
    expect(authz.checkPlatformPermission(superAdminCtx, "platform:delete").allowed).toBe(true);
  });

  it("should deny viewer platform write", () => {
    expect(authz.checkPlatformPermission(viewerCtx, "platform:write").allowed).toBe(false);
  });

  it("should require platform permission and throw", () => {
    expect(() => authz.requirePlatformPermission(viewerCtx, "platform:write")).toThrow(AuthorizationError);
  });

  it("should check any permission", () => {
    expect(authz.checkAnyPlatformPermission(superAdminCtx, ["platform:write", "platform:delete"]).allowed).toBe(true);
    expect(authz.checkAnyPlatformPermission(viewerCtx, ["platform:write", "platform:delete"]).allowed).toBe(false);
  });

  it("should check all permissions", () => {
    expect(authz.checkAllPlatformPermissions(superAdminCtx, ["platform:read", "platform:write"]).allowed).toBe(true);
    expect(authz.checkAllPlatformPermissions(viewerCtx, ["platform:read", "platform:write"]).allowed).toBe(false);
  });

  it("should include required permissions in deny response", () => {
    const check = authz.checkPlatformPermission(viewerCtx, "platform:write");
    expect(check.requiredPermissions).toEqual(["platform:write"]);
  });

  it("should allow workspace access for same workspace", () => {
    expect(authz.checkWorkspaceAccess(superAdminCtx, "ws-1").allowed).toBe(true);
  });

  it("should deny cross-workspace access for non-superadmin", () => {
    const check = authz.checkWorkspaceAccess(otherWorkspaceCtx, "ws-1");
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Cross-workspace");
  });

  it("should allow cross-workspace access for super_admin", () => {
    expect(authz.checkWorkspaceAccess(superAdminCtx, "ws-999").allowed).toBe(true);
  });

  it("should require workspace access and throw TenantIsolationError", () => {
    expect(() => authz.requireWorkspaceAccess(otherWorkspaceCtx, "ws-1")).toThrow(TenantIsolationError);
  });

  it("should require resource access and throw on insufficient permissions", () => {
    expect(() => authz.requireResourceAccess(viewerCtx, "content", { workspaceId: "ws-1", userId: "u2" }, "workspace:content:write")).toThrow(AuthorizationError);
  });

  it("should throw TenantIsolationError on workspace mismatch", () => {
    expect(() => authz.requireResourceAccess(
      { userId: "u1", platformRole: "creator_owner", workspaceRole: "owner", workspaceId: "ws-1" },
      "content", { workspaceId: "ws-2", userId: "u1" }, "workspace:content:write"
    )).toThrow(TenantIsolationError);
  });

  it("should not throw when resource access is valid", () => {
    expect(() => authz.requireResourceAccess(
      { userId: "u1", platformRole: "creator_owner", workspaceRole: "owner", workspaceId: "ws-1" },
      "content", { workspaceId: "ws-1", userId: "u1" }, "workspace:content:write"
    )).not.toThrow();
  });
});

describe("Authorization Policies", () => {
  it("should return policy for known resource types", () => {
    const policy = getResourcePolicy("content");
    expect(policy).toBeDefined();
    expect(policy!.ownerField).toBe("userId");
    expect(policy!.workspaceField).toBe("workspaceId");
  });

  it("should return undefined for unknown resource types", () => {
    expect(getResourcePolicy("unknown")).toBeUndefined();
  });

  it("should validate workspace scope", () => {
    expect(validateWorkspaceScope("content", { workspaceId: "ws-1", userId: "u1" }, "ws-1")).toBe(true);
    expect(validateWorkspaceScope("content", { workspaceId: "ws-2", userId: "u1" }, "ws-1")).toBe(false);
  });

  it("should validate ownership", () => {
    expect(validateOwnership("content", { userId: "u1", workspaceId: "ws-1" }, "u1")).toBe(true);
    expect(validateOwnership("content", { userId: "u2", workspaceId: "ws-1" }, "u1")).toBe(false);
  });

  it("should return all defined resource policies", () => {
    expect(getResourcePolicy("campaign")).toBeDefined();
    expect(getResourcePolicy("analytics_report")).toBeDefined();
    expect(getResourcePolicy("brand")).toBeDefined();
    expect(getResourcePolicy("invoice")).toBeDefined();
    expect(getResourcePolicy("template")).toBeDefined();
  });
});

describe("SessionService", () => {
  let sessionCounter = 0;

  function createMockSessionRepo() {
    const sessions = new Map<string, IdentitySession>();
    return {
      findById: vi.fn(async (id: string) => sessions.get(id) ?? null),
      findByToken: vi.fn(async (token: string) => {
        for (const s of sessions.values()) {
          if (s.token === token) return s;
        }
        return null;
      }),
      findByRefreshToken: vi.fn(async (refreshToken: string) => {
        for (const s of sessions.values()) {
          if (s.refreshToken === refreshToken) return s;
        }
        return null;
      }),
      findByUser: vi.fn(async (userId: string) =>
        Array.from(sessions.values()).filter((s) => s.userId === userId)
      ),
      create: vi.fn(async (input: IdentitySession) => {
        sessions.set(input.id, input);
        return input;
      }),
      updateStatus: vi.fn(async (id: string, status: string) => {
        const s = sessions.get(id);
        if (s) sessions.set(id, { ...s, status: status as IdentitySession["status"] });
      }),
      updateActivity: vi.fn(async (_id: string) => { }),
      delete: vi.fn(async (id: string) => { sessions.delete(id); }),
      deleteAllForUser: vi.fn(async (_userId: string) => { }),
    };
  }

  it("should create a session", async () => {
    sessionCounter++;
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const session = await svc.create({ userId: `user-${sessionCounter}` });
    expect(session.userId).toBe(`user-${sessionCounter}`);
    expect(session.token).toBeTruthy();
    expect(session.refreshToken).toBeTruthy();
    expect(session.status).toBe("active");
  });

  it("should validate an active session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const created = await svc.create({ userId: "user-v" });
    const validated = await svc.validate(created.token);
    expect(validated.id).toBe(created.id);
  });

  it("should throw InvalidTokenError for unknown token", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    await expect(svc.validate("bad-token")).rejects.toThrow(InvalidTokenError);
  });

  it("should throw SessionExpiredError on expired session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const past = new Date(Date.now() - 100000);
    const session: IdentitySession = {
      id: "s-exp-1", userId: "u1", token: "tok-exp", refreshToken: "ref-exp",
      deviceInfo: null, ipAddress: null, lastActivityAt: past,
      expiresAt: past, status: "active", createdAt: past,
    };
    await repo.create(session);

    await expect(svc.validate("tok-exp")).rejects.toThrow(SessionExpiredError);
  });

  it("should throw SessionRevokedError on revoked session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const future = new Date(Date.now() + 100000);
    const session: IdentitySession = {
      id: "s-rev-1", userId: "u1", token: "tok-rev", refreshToken: "ref-rev",
      deviceInfo: null, ipAddress: null, lastActivityAt: future,
      expiresAt: future, status: "revoked", createdAt: new Date(),
    };
    await repo.create(session);

    await expect(svc.validate("tok-rev")).rejects.toThrow(SessionRevokedError);
  });

  it("should refresh a session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const future = new Date(Date.now() + 100000);
    const session: IdentitySession = {
      id: "s-ref-1", userId: "u1", token: "tok-ref", refreshToken: "ref-ref",
      deviceInfo: null, ipAddress: null, lastActivityAt: future,
      expiresAt: future, status: "active", createdAt: new Date(),
    };
    await repo.create(session);

    const refreshed = await svc.refresh("ref-ref");
    expect(refreshed.token).not.toBe("tok-ref");
    expect(refreshed.refreshToken).not.toBe("ref-ref");
  });

  it("should throw InvalidTokenError on refresh with unknown token", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    await expect(svc.refresh("bad-refresh")).rejects.toThrow(InvalidTokenError);
  });

  it("should throw SessionExpiredError on refresh of expired session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const past = new Date(Date.now() - 100000);
    const session: IdentitySession = {
      id: "s-ref-exp", userId: "u1", token: "tok-re", refreshToken: "ref-re",
      deviceInfo: null, ipAddress: null, lastActivityAt: past,
      expiresAt: past, status: "active", createdAt: past,
    };
    await repo.create(session);

    await expect(svc.refresh("ref-re")).rejects.toThrow(SessionExpiredError);
  });

  it("should revoke a session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const session = await svc.create({ userId: "user-revoke" });
    await svc.revoke(session.id, "admin", "manual");

    await expect(svc.validate(session.token)).rejects.toThrow(SessionRevokedError);
  });

  it("should get user sessions", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    await svc.create({ userId: "user-list" });
    await svc.create({ userId: "user-list" });
    const sessions = await svc.getUserSessions("user-list");
    expect(sessions.length).toBe(2);
  });

  it("should delete a session", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    const session = await svc.create({ userId: "user-del" });
    await svc.delete(session.id);

    await expect(svc.getSession(session.id)).rejects.toThrow(InvalidTokenError);
  });

  it("should throw InvalidTokenError for non-existent session get", async () => {
    const repo = createMockSessionRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new SessionService(repo, dispatcher);

    await expect(svc.getSession("nonexistent")).rejects.toThrow(InvalidTokenError);
  });
});

describe("InvitationService", () => {
  function createMockInviteRepo() {
    const invites = new Map<string, WorkspaceInvitation>();
    return {
      findById: vi.fn(async (id: string) => invites.get(id) ?? null),
      findByToken: vi.fn(async (token: string) => {
        for (const inv of invites.values()) {
          if (inv.token === token) return inv;
        }
        return null;
      }),
      findByWorkspace: vi.fn(async (workspaceId: string) =>
        Array.from(invites.values()).filter((i) => i.workspaceId === workspaceId)
      ),
      findByEmail: vi.fn(async (email: string) =>
        Array.from(invites.values()).filter((i) => i.email === email)
      ),
      create: vi.fn(async (input: WorkspaceInvitation) => {
        invites.set(input.id, input);
        return input;
      }),
      updateStatus: vi.fn(async (id: string, _status: string, _acceptedAt?: Date) => {
        const inv = invites.get(id);
        if (inv) {
          invites.set(id, { ...inv, status: _status as WorkspaceInvitation["status"], acceptedAt: _acceptedAt ?? null });
        }
      }),
      delete: vi.fn(async (id: string) => { invites.delete(id); }),
    };
  }

  it("should send an invitation", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const inv = await svc.send({
      workspaceId: "ws-1",
      email: "test@test.com",
      role: "member",
      invitedByUserId: "user-1",
    });

    expect(inv.email).toBe("test@test.com");
    expect(inv.token).toBeTruthy();
    expect(inv.status).toBe("pending");
  });

  it("should lowercase email on send", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const inv = await svc.send({
      workspaceId: "ws-1",
      email: "UPPERCASE@TEST.COM",
      role: "member",
      invitedByUserId: "user-1",
    });

    expect(inv.email).toBe("uppercase@test.com");
  });

  it("should accept a valid invitation", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const future = new Date(Date.now() + 100000);
    const inv = await svc.send({
      workspaceId: "ws-1", email: "accept@test.com",
      role: "member", invitedByUserId: "user-1", expiresAt: future,
    });

    const accepted = await svc.accept(inv.token, "new-user");
    expect(accepted.status).toBe("accepted");
  });

  it("should reject expired invitation", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const past = new Date(Date.now() - 100000);
    const inv = await svc.send({
      workspaceId: "ws-1", email: "expired@test.com",
      role: "member", invitedByUserId: "user-1", expiresAt: past,
    });

    await expect(svc.accept(inv.token, "new-user")).rejects.toThrow(InvitationExpiredError);
  });

  it("should mark expired invitation as expired on attempted accept", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const past = new Date(Date.now() - 100000);
    const inv = await svc.send({
      workspaceId: "ws-1", email: "mark-exp@test.com",
      role: "member", invitedByUserId: "user-1", expiresAt: past,
    });

    try { await svc.accept(inv.token, "new-user"); } catch { /* expected */ }
    const fetched = await svc.getInvitation(inv.id);
    expect(fetched.status).toBe("expired");
  });

  it("should reject already-accepted invitation", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const future = new Date(Date.now() + 100000);
    const inv = await svc.send({
      workspaceId: "ws-1", email: "already@test.com",
      role: "member", invitedByUserId: "user-1", expiresAt: future,
    });

    await svc.accept(inv.token, "user-a");
    await expect(svc.accept(inv.token, "user-b")).rejects.toThrow(InvitationNotFoundError);
  });

  it("should validate invitation token", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const result = await svc.validate("bad-token");
    expect(result.isValid).toBe(false);
    expect(result.reason).toBe("Invitation not found");
  });

  it("should validate and return invitation for valid token", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const future = new Date(Date.now() + 100000);
    const inv = await svc.send({
      workspaceId: "ws-1", email: "valid@test.com",
      role: "member", invitedByUserId: "user-1", expiresAt: future,
    });

    const result = await svc.validate(inv.token);
    expect(result.isValid).toBe(true);
    expect(result.invitation).toBeDefined();
  });

  it("should revoke an invitation", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    const inv = await svc.send({
      workspaceId: "ws-1", email: "revoke@test.com",
      role: "member", invitedByUserId: "user-1",
    });

    await svc.revoke(inv.id);
    const fetched = await svc.getInvitation(inv.id);
    expect(fetched.status).toBe("revoked");
  });

  it("should get workspace invitations", async () => {
    const repo = createMockInviteRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new InvitationService(repo, dispatcher);

    await svc.send({ workspaceId: "ws-1", email: "a@test.com", role: "member", invitedByUserId: "u1" });
    await svc.send({ workspaceId: "ws-1", email: "b@test.com", role: "admin", invitedByUserId: "u1" });
    const invitations = await svc.getWorkspaceInvitations("ws-1");
    expect(invitations.length).toBe(2);
  });
});

describe("AuthenticationService", () => {
  let userCounter = 0;

  function createMockUserRepo() {
    const users = new Map<string, IdentityUser>();
    return {
      findById: vi.fn(async (id: string) => users.get(id) ?? null),
      findByEmail: vi.fn(async (email: string) => {
        for (const u of users.values()) {
          if (u.email === email) return u;
        }
        return null;
      }),
      create: vi.fn(async (input: { email: string; name: string; authProvider: string; platformRole: string; passwordHash: string | null }) => {
        userCounter++;
        const user: IdentityUser = {
          id: `user-${userCounter}`,
          email: input.email,
          name: input.name,
          avatarUrl: null,
          emailVerified: false,
          authProvider: input.authProvider as IdentityUser["authProvider"],
          platformRole: input.platformRole as PlatformRole,
          lastLoginAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        users.set(user.id, user);
        return user;
      }),
      updatePassword: vi.fn(async () => { }),
      verifyEmail: vi.fn(async (userId: string) => {
        const u = users.get(userId);
        if (u) users.set(userId, { ...u, emailVerified: true });
      }),
      updateLastLogin: vi.fn(async (_userId: string) => { }),
    };
  }

  it("should register a new user", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const user = await svc.register({
      email: "register@test.com",
      password: "StrongP@ss1",
      name: "Test User",
      persona: "creator",
    });

    expect(user.email).toBe("register@test.com");
    expect(user.platformRole).toBe("creator_owner");
  });

  it("should register agency user with agency_admin role", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const user = await svc.register({
      email: "agency-reg@test.com",
      password: "StrongP@ss1",
      name: "Agency User",
      persona: "agency",
    });

    expect(user.platformRole).toBe("agency_admin");
  });

  it("should reject duplicate email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await svc.register({ email: "dup-auth@test.com", password: "StrongP@ss1", name: "Dup", persona: "creator" });
    await expect(
      svc.register({ email: "dup-auth@test.com", password: "StrongP@ss1", name: "Dup", persona: "creator" })
    ).rejects.toThrow(UserAlreadyExistsError);
  });

  it("should validate password strength - weak password", () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const result = svc.validatePassword("weak");
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("should validate password strength - strong password", () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const result = svc.validatePassword("StrongP@ss1");
    expect(result.isValid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  it("should reject weak password on register", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await expect(
      svc.register({ email: "weak@test.com", password: "short", name: "Weak", persona: "creator" })
    ).rejects.toThrow(AuthenticationError);
  });

  it("should login with verified email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const user = await svc.register({
      email: "login-ok@test.com",
      password: "StrongP@ss1",
      name: "Login",
      persona: "creator",
    });
    await svc.verifyEmail(user.id);

    const loggedIn = await svc.login({ email: "login-ok@test.com", password: "StrongP@ss1" });
    expect(loggedIn.email).toBe("login-ok@test.com");
  });

  it("should reject login with unverified email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await svc.register({
      email: "unverified-login@test.com", password: "StrongP@ss1",
      name: "Unverified", persona: "creator",
    });

    await expect(
      svc.login({ email: "unverified-login@test.com", password: "StrongP@ss1" })
    ).rejects.toThrow(EmailNotVerifiedError);
  });

  it("should reject login with non-existent email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await expect(
      svc.login({ email: "noone@test.com", password: "StrongP@ss1" })
    ).rejects.toThrow(AuthenticationError);
  });

  it("should get user by email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await svc.register({ email: "getuser@test.com", password: "StrongP@ss1", name: "Get", persona: "creator" });
    const user = await svc.getUserByEmail("getuser@test.com");
    expect(user.email).toBe("getuser@test.com");
  });

  it("should throw UserNotFoundError for unknown email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await expect(svc.getUserByEmail("nobody@test.com")).rejects.toThrow(UserNotFoundError);
  });

  it("should get user by id", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const user = await svc.register({ email: "getbyid@test.com", password: "StrongP@ss1", name: "ByID", persona: "creator" });
    const fetched = await svc.getUserById(user.id);
    expect(fetched.id).toBe(user.id);
  });

  it("should throw UserNotFoundError for unknown id", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    await expect(svc.getUserById("unknown-id")).rejects.toThrow(UserNotFoundError);
  });

  it("should verify email", async () => {
    const repo = createMockUserRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new AuthenticationService(repo, dispatcher);

    const user = await svc.register({ email: "verify@test.com", password: "StrongP@ss1", name: "Verify", persona: "creator" });
    await svc.verifyEmail(user.id);

    const fetched = await svc.getUserById(user.id);
    expect(fetched.emailVerified).toBe(true);
  });
});

describe("MembershipService", () => {
  let memCounter = 0;

  function createMockMembershipRepo() {
    const memberships = new Map<string, WorkspaceMember>();
    return {
      findById: vi.fn(async (id: string) => memberships.get(id) ?? null),
      findByWorkspace: vi.fn(async (workspaceId: string) => {
        const members = Array.from(memberships.values()).filter(m => m.workspaceId === workspaceId);
        return members.map(m => ({
          ...m,
          user: {
            id: m.userId, email: `${m.userId}@test.com`, name: "User",
            avatarUrl: null, emailVerified: true, authProvider: "email" as const,
            platformRole: "viewer" as PlatformRole, lastLoginAt: null,
            createdAt: new Date(), updatedAt: new Date(),
          },
        })) as any[];
      }),
      findByUser: vi.fn(async (userId: string) =>
        Array.from(memberships.values()).filter(m => m.userId === userId)
      ),
      find: vi.fn(async (workspaceId: string, userId: string) => {
        for (const m of memberships.values()) {
          if (m.workspaceId === workspaceId && m.userId === userId) return m;
        }
        return null;
      }),
      create: vi.fn(async (input: { workspaceId: string; userId: string; role: string; invitedAt?: Date }) => {
        memCounter++;
        const m: WorkspaceMember = {
          id: `mem-${memCounter}`,
          workspaceId: input.workspaceId,
          userId: input.userId,
          role: input.role as WorkspaceRole,
          joinedAt: new Date(),
          invitedAt: input.invitedAt ?? null,
        };
        memberships.set(m.id, m);
        return m;
      }),
      update: vi.fn(async (id: string, input: { role: WorkspaceRole }) => {
        const m = memberships.get(id);
        if (!m) throw new Error("not found");
        const updated = { ...m, role: input.role };
        memberships.set(id, updated);
        return updated;
      }),
      delete: vi.fn(async (id: string) => { memberships.delete(id); }),
    };
  }

  it("should add a member", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    const m = await svc.addMember("actor-1", { workspaceId: "ws-1", userId: "user-1", role: "member" });
    expect(m.workspaceId).toBe("ws-1");
    expect(m.role).toBe("member");
  });

  it("should get workspace members", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    await svc.addMember("a1", { workspaceId: "ws-mem", userId: "u1", role: "member" });
    await svc.addMember("a1", { workspaceId: "ws-mem", userId: "u2", role: "admin" });

    const members = await svc.getWorkspaceMembers("ws-mem");
    expect(members.length).toBe(2);
  });

  it("should change member role", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    const m = await svc.addMember("a1", { workspaceId: "ws-role", userId: "u1", role: "member" });
    const updated = await svc.changeRole("a1", m.id, "admin");
    expect(updated.role).toBe("admin");
  });

  it("should remove a member", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    const m = await svc.addMember("a1", { workspaceId: "ws-rm", userId: "u1", role: "member" });
    await svc.removeMember("a1", m.id);

    await expect(svc.getMembership(m.id)).rejects.toThrow(MembershipNotFoundError);
  });

  it("should get user role in workspace", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    await svc.addMember("a1", { workspaceId: "ws-role-get", userId: "u1", role: "admin" });
    const role = await svc.getUserRole("ws-role-get", "u1");
    expect(role).toBe("admin");
  });

  it("should return null for non-member role check", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    const role = await svc.getUserRole("ws-nobody", "nobody");
    expect(role).toBeNull();
  });

  it("should get user memberships", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    await svc.addMember("a1", { workspaceId: "ws-a", userId: "multi", role: "member" });
    await svc.addMember("a1", { workspaceId: "ws-b", userId: "multi", role: "admin" });

    const memberships = await svc.getUserMemberships("multi");
    expect(memberships.length).toBe(2);
  });

  it("should find specific membership", async () => {
    const repo = createMockMembershipRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new MembershipService(repo, dispatcher);

    await svc.addMember("a1", { workspaceId: "ws-find", userId: "u-find", role: "member" });
    const found = await svc.findMembership("ws-find", "u-find");
    expect(found).not.toBeNull();
    expect(found!.role).toBe("member");
  });
});

describe("WorkspaceService", () => {
  let wsCounter = 0;

  function createMockWorkspaceRepo() {
    const workspaces = new Map<string, IdentityWorkspace>();
    return {
      findById: vi.fn(async (id: string) => workspaces.get(id) ?? null),
      findBySlug: vi.fn(async (slug: string) => {
        for (const w of workspaces.values()) {
          if (w.slug === slug) return w;
        }
        return null;
      }),
      findByOrganization: vi.fn(async (orgId: string) =>
        Array.from(workspaces.values()).filter(w => w.organizationId === orgId)
      ),
      findByUser: vi.fn(async (_userId: string) => Array.from(workspaces.values())),
      create: vi.fn(async (input: { organizationId: string; name: string; slug: string; type: string; isFreelancer?: boolean }) => {
        wsCounter++;
        const ws: IdentityWorkspace = {
          id: `ws-${wsCounter}`,
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug,
          type: input.type as IdentityWorkspace["type"],
          status: "active",
          isFreelancer: input.isFreelancer ?? false,
          onboardingCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        workspaces.set(ws.id, ws);
        return ws;
      }),
      update: vi.fn(async (id: string, input: any) => {
        const w = workspaces.get(id)!;
        const updated = { ...w, ...input };
        workspaces.set(id, updated);
        return updated;
      }),
      updateStatus: vi.fn(async (id: string, status: string) => {
        const w = workspaces.get(id);
        if (w) workspaces.set(id, { ...w, status: status as IdentityWorkspace["status"] });
      }),
    };
  }

  it("should create a workspace", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const ws = await svc.create({
      organizationId: "org-1",
      name: "Test Workspace",
      slug: "test-ws",
      type: "creator",
      ownerUserId: "user-1",
    });

    expect(ws.name).toBe("Test Workspace");
    expect(ws.status).toBe("active");
  });

  it("should get workspace by id", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const created = await svc.create({
      organizationId: "org-1", name: "Get Test", slug: "get-test", type: "creator", ownerUserId: "u1",
    });
    const fetched = await svc.getWorkspace(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it("should throw WorkspaceNotFoundError for unknown id", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    await expect(svc.getWorkspace("nonexistent")).rejects.toThrow(WorkspaceNotFoundError);
  });

  it("should get workspace by slug", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    await svc.create({
      organizationId: "org-1", name: "Slug Test", slug: "slug-test", type: "creator", ownerUserId: "u1",
    });
    const ws = await svc.getWorkspaceBySlug("slug-test");
    expect(ws).not.toBeNull();
    expect(ws!.slug).toBe("slug-test");
  });

  it("should return null for unknown slug", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const ws = await svc.getWorkspaceBySlug("unknown-slug");
    expect(ws).toBeNull();
  });

  it("should update workspace status", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const created = await svc.create({
      organizationId: "org-1", name: "Status Test", slug: "status-test", type: "creator", ownerUserId: "u1",
    });
    await svc.updateStatus(created.id, "suspended");
    const fetched = await svc.getWorkspace(created.id);
    expect(fetched.status).toBe("suspended");
  });

  it("should get organization workspaces", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    await svc.create({ organizationId: "org-ws", name: "W1", slug: "w1", type: "creator", ownerUserId: "u1" });
    await svc.create({ organizationId: "org-ws", name: "W2", slug: "w2", type: "creator", ownerUserId: "u1" });

    const workspaces = await svc.getOrganizationWorkspaces("org-ws");
    expect(workspaces.length).toBe(2);
  });

  it("should query workspaces by type and status", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const ws1 = await svc.create({ organizationId: "org-q", name: "Q1", slug: "q1", type: "creator", ownerUserId: "quser" });
    const ws2 = await svc.create({ organizationId: "org-q", name: "Q2", slug: "q2", type: "agency", ownerUserId: "quser" });
    await svc.updateStatus(ws1.id, "suspended");

    const results = await svc.query({ userId: "quser", type: "agency" });
    expect(results.length).toBe(1);
    expect(results[0].type).toBe("agency");
  });

  it("should update workspace details", async () => {
    const repo = createMockWorkspaceRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new WorkspaceService(repo, dispatcher);

    const created = await svc.create({
      organizationId: "org-1", name: "Old Name", slug: "old-name", type: "creator", ownerUserId: "u1",
    });
    const updated = await svc.update(created.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });
});

describe("OrganizationService", () => {
  let orgCounter = 0;

  function createMockOrgRepo() {
    const orgs = new Map<string, Organization>();
    return {
      findById: vi.fn(async (id: string) => orgs.get(id) ?? null),
      findByOwner: vi.fn(async (ownerId: string) =>
        Array.from(orgs.values()).filter(o => o.ownerId === ownerId)
      ),
      create: vi.fn(async (input: { name: string; type: string; ownerId: string }) => {
        orgCounter++;
        const org: Organization = {
          id: `org-${orgCounter}`,
          name: input.name,
          type: input.type as Organization["type"],
          ownerId: input.ownerId,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        orgs.set(org.id, org);
        return org;
      }),
      update: vi.fn(async (id: string, input: any) => {
        const o = orgs.get(id)!;
        const updated = { ...o, ...input };
        orgs.set(id, updated);
        return updated;
      }),
      delete: vi.fn(async (id: string) => { orgs.delete(id); }),
    };
  }

  it("should create an organization", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    const org = await svc.create({ name: "Test Org", type: "individual", ownerId: "user-1" });
    expect(org.name).toBe("Test Org");
    expect(org.ownerId).toBe("user-1");
  });

  it("should get organization by id", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    const created = await svc.create({ name: "Get Org", type: "agency", ownerId: "u1" });
    const fetched = await svc.getOrganization(created.id);
    expect(fetched.id).toBe(created.id);
  });

  it("should throw OrganizationNotFoundError for unknown id", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    await expect(svc.getOrganization("nonexistent")).rejects.toThrow(OrganizationNotFoundError);
  });

  it("should get owner organizations", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    await svc.create({ name: "Org A", type: "individual", ownerId: "owner-u1" });
    await svc.create({ name: "Org B", type: "individual", ownerId: "owner-u1" });

    const orgs = await svc.getOwnerOrganizations("owner-u1");
    expect(orgs.length).toBe(2);
  });

  it("should return empty array for owner with no orgs", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    const orgs = await svc.getOwnerOrganizations("no-orgs");
    expect(orgs.length).toBe(0);
  });

  it("should update an organization", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    const created = await svc.create({ name: "Old Name", type: "individual", ownerId: "u1" });
    const updated = await svc.update(created.id, { name: "New Name" });
    expect(updated.name).toBe("New Name");
  });

  it("should delete an organization", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    const created = await svc.create({ name: "Delete Me", type: "individual", ownerId: "u1" });
    await svc.delete(created.id);

    await expect(svc.getOrganization(created.id)).rejects.toThrow(OrganizationNotFoundError);
  });

  it("should throw on delete of non-existent org", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    await expect(svc.delete("nonexistent")).rejects.toThrow(OrganizationNotFoundError);
  });

  it("should throw on update of non-existent org", async () => {
    const repo = createMockOrgRepo();
    const dispatcher = new IdentityEventDispatcher();
    const svc = new OrganizationService(repo, dispatcher);

    await expect(svc.update("nonexistent", { name: "Nope" })).rejects.toThrow(OrganizationNotFoundError);
  });
});

describe("IdentityError types", () => {
  it("should create AuthenticationError with defaults", () => {
    const err = new AuthenticationError();
    expect(err.code).toBe("AUTHENTICATION_FAILED");
    expect(err.statusCode).toBe(401);
  });

  it("should create AuthenticationError with custom message", () => {
    const err = new AuthenticationError("Custom message");
    expect(err.message).toBe("Custom message");
  });

  it("should create AuthorizationError with defaults", () => {
    const err = new AuthorizationError();
    expect(err.code).toBe("AUTHORIZATION_FAILED");
    expect(err.statusCode).toBe(403);
  });

  it("should create UserNotFoundError with email", () => {
    const err = new UserNotFoundError("test@test.com");
    expect(err.message).toContain("test@test.com");
  });

  it("should create UserNotFoundError without email", () => {
    const err = new UserNotFoundError();
    expect(err.message).toBe("User not found");
  });

  it("should create UserAlreadyExistsError", () => {
    const err = new UserAlreadyExistsError("test@test.com");
    expect(err.statusCode).toBe(409);
  });

  it("should create AccountLockedError with minutes", () => {
    const err = new AccountLockedError(15);
    expect(err.message).toContain("15");
    expect(err.statusCode).toBe(429);
  });

  it("should create TenantIsolationError", () => {
    const err = new TenantIsolationError();
    expect(err.code).toBe("TENANT_ISOLATION");
  });

  it("should create ResourceOwnershipError", () => {
    const err = new ResourceOwnershipError();
    expect(err.code).toBe("RESOURCE_OWNERSHIP");
  });

  it("should create SessionExpiredError", () => {
    const err = new SessionExpiredError();
    expect(err.statusCode).toBe(401);
  });

  it("should create InvalidTokenError", () => {
    const err = new InvalidTokenError();
    expect(err.statusCode).toBe(401);
  });

  it("should create EmailNotVerifiedError", () => {
    const err = new EmailNotVerifiedError();
    expect(err.code).toBe("EMAIL_NOT_VERIFIED");
  });

  it("should create WorkspaceNotFoundError", () => {
    const err = new WorkspaceNotFoundError("ws-1");
    expect(err.message).toContain("ws-1");
  });

  it("should create WorkspaceNotFoundError without id", () => {
    const err = new WorkspaceNotFoundError();
    expect(err.message).toBe("Workspace not found");
  });

  it("should create MembershipNotFoundError", () => {
    const err = new MembershipNotFoundError();
    expect(err.code).toBe("MEMBERSHIP_NOT_FOUND");
  });

  it("should create InvitationNotFoundError", () => {
    const err = new InvitationNotFoundError();
    expect(err.code).toBe("INVITATION_NOT_FOUND");
  });

  it("should create InvitationExpiredError", () => {
    const err = new InvitationExpiredError();
    expect(err.statusCode).toBe(410);
  });

  it("should create OrganizationNotFoundError", () => {
    const err = new OrganizationNotFoundError("org-1");
    expect(err.message).toContain("org-1");
  });
});

describe("IdentityConfig defaults", () => {
  it("should have sessionMaxAge of 7 days", () => {
    expect(DEFAULT_IDENTITY_CONFIG.sessionMaxAge).toBe(7 * 24 * 60 * 60);
  });

  it("should have invitationExpiresInHours of 48", () => {
    expect(DEFAULT_IDENTITY_CONFIG.invitationExpiresInHours).toBe(48);
  });

  it("should have bcryptRounds of 12", () => {
    expect(DEFAULT_IDENTITY_CONFIG.bcryptRounds).toBe(12);
  });

  it("should have maxFailedAttempts of 5", () => {
    expect(DEFAULT_IDENTITY_CONFIG.maxFailedAttempts).toBe(5);
  });

  it("should have passwordMinLength of 8", () => {
    expect(DEFAULT_IDENTITY_CONFIG.passwordMinLength).toBe(8);
  });
});
