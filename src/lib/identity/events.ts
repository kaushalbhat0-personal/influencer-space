export type IdentityEventType =
  | "identity:user:created"
  | "identity:user:verified"
  | "identity:user:login"
  | "identity:user:password-reset"
  | "identity:session:created"
  | "identity:session:revoked"
  | "identity:workspace:created"
  | "identity:organization:created"
  | "identity:membership:created"
  | "identity:membership:role-changed"
  | "identity:membership:removed"
  | "identity:invitation:sent"
  | "identity:invitation:accepted"
  | "identity:invitation:expired"
  | "identity:role:changed";

export interface IdentityEvent {
  readonly type: IdentityEventType;
  readonly timestamp: Date;
  readonly actorId: string;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface UserCreatedEvent extends IdentityEvent {
  readonly type: "identity:user:created";
  readonly payload: { readonly userId: string; readonly email: string; readonly authProvider: string };
}

export interface UserVerifiedEvent extends IdentityEvent {
  readonly type: "identity:user:verified";
  readonly payload: { readonly userId: string; readonly email: string };
}

export interface UserLoginEvent extends IdentityEvent {
  readonly type: "identity:user:login";
  readonly payload: { readonly userId: string; readonly sessionId: string; readonly ipAddress: string | null };
}

export interface PasswordResetEvent extends IdentityEvent {
  readonly type: "identity:user:password-reset";
  readonly payload: { readonly userId: string };
}

export interface SessionCreatedEvent extends IdentityEvent {
  readonly type: "identity:session:created";
  readonly payload: { readonly userId: string; readonly sessionId: string };
}

export interface SessionRevokedEvent extends IdentityEvent {
  readonly type: "identity:session:revoked";
  readonly payload: { readonly userId: string; readonly sessionId: string; readonly reason: string };
}

export interface WorkspaceCreatedEvent extends IdentityEvent {
  readonly type: "identity:workspace:created";
  readonly payload: { readonly workspaceId: string; readonly organizationId: string; readonly type: string };
}

export interface OrganizationCreatedEvent extends IdentityEvent {
  readonly type: "identity:organization:created";
  readonly payload: { readonly organizationId: string; readonly ownerId: string; readonly type: string };
}

export interface MembershipCreatedEvent extends IdentityEvent {
  readonly type: "identity:membership:created";
  readonly payload: { readonly userId: string; readonly workspaceId: string; readonly role: string };
}

export interface MembershipRoleChangedEvent extends IdentityEvent {
  readonly type: "identity:membership:role-changed";
  readonly payload: { readonly userId: string; readonly workspaceId: string; readonly previousRole: string; readonly newRole: string };
}

export interface MembershipRemovedEvent extends IdentityEvent {
  readonly type: "identity:membership:removed";
  readonly payload: { readonly userId: string; readonly workspaceId: string };
}

export interface InvitationSentEvent extends IdentityEvent {
  readonly type: "identity:invitation:sent";
  readonly payload: { readonly invitationId: string; readonly workspaceId: string; readonly email: string; readonly role: string };
}

export interface InvitationAcceptedEvent extends IdentityEvent {
  readonly type: "identity:invitation:accepted";
  readonly payload: { readonly invitationId: string; readonly userId: string; readonly workspaceId: string };
}

export interface InvitationExpiredEvent extends IdentityEvent {
  readonly type: "identity:invitation:expired";
  readonly payload: { readonly invitationId: string; readonly email: string };
}

export interface RoleChangedEvent extends IdentityEvent {
  readonly type: "identity:role:changed";
  readonly payload: { readonly userId: string; readonly workspaceId: string; readonly previousRole: string; readonly newRole: string };
}

export type IdentityEventPayload =
  | UserCreatedEvent
  | UserVerifiedEvent
  | UserLoginEvent
  | PasswordResetEvent
  | SessionCreatedEvent
  | SessionRevokedEvent
  | WorkspaceCreatedEvent
  | OrganizationCreatedEvent
  | MembershipCreatedEvent
  | MembershipRoleChangedEvent
  | MembershipRemovedEvent
  | InvitationSentEvent
  | InvitationAcceptedEvent
  | InvitationExpiredEvent
  | RoleChangedEvent;

export type IdentityEventHandler = (event: IdentityEventPayload) => void;

export class IdentityEventDispatcher {
  private readonly listeners: Map<string, Set<IdentityEventHandler>> = new Map();

  on(type: IdentityEventType, handler: IdentityEventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(handler);
    return () => {
      this.off(type, handler);
    };
  }

  off(type: IdentityEventType, handler: IdentityEventHandler): void {
    const set = this.listeners.get(type);
    if (set) {
      set.delete(handler);
      if (set.size === 0) {
        this.listeners.delete(type);
      }
    }
  }

  emit(event: IdentityEventPayload): void {
    const set = this.listeners.get(event.type);
    if (set) {
      Array.from(set).forEach((handler) => {
        handler(event);
      });
    }
  }

  removeAll(): void {
    this.listeners.clear();
  }
}

function createIdentityEvent<E extends IdentityEventPayload>(
  type: E["type"],
  actorId: string,
  payload: E["payload"]
): E {
  return Object.freeze({
    type,
    timestamp: new Date(),
    actorId,
    payload: Object.freeze({ ...payload }),
  }) as E;
}

export function createUserCreatedEvent(
  actorId: string, userId: string, email: string, authProvider: string
): UserCreatedEvent {
  return createIdentityEvent("identity:user:created", actorId, { userId, email, authProvider });
}

export function createUserVerifiedEvent(actorId: string, userId: string, email: string): UserVerifiedEvent {
  return createIdentityEvent("identity:user:verified", actorId, { userId, email });
}

export function createUserLoginEvent(actorId: string, userId: string, sessionId: string, ipAddress: string | null): UserLoginEvent {
  return createIdentityEvent("identity:user:login", actorId, { userId, sessionId, ipAddress });
}

export function createSessionCreatedEvent(actorId: string, userId: string, sessionId: string): SessionCreatedEvent {
  return createIdentityEvent("identity:session:created", actorId, { userId, sessionId });
}

export function createSessionRevokedEvent(actorId: string, userId: string, sessionId: string, reason: string): SessionRevokedEvent {
  return createIdentityEvent("identity:session:revoked", actorId, { userId, sessionId, reason });
}

export function createWorkspaceCreatedEvent(actorId: string, workspaceId: string, organizationId: string, type: string): WorkspaceCreatedEvent {
  return createIdentityEvent("identity:workspace:created", actorId, { workspaceId, organizationId, type });
}

export function createOrganizationCreatedEvent(actorId: string, organizationId: string, ownerId: string, type: string): OrganizationCreatedEvent {
  return createIdentityEvent("identity:organization:created", actorId, { organizationId, ownerId, type });
}

export function createMembershipCreatedEvent(actorId: string, userId: string, workspaceId: string, role: string): MembershipCreatedEvent {
  return createIdentityEvent("identity:membership:created", actorId, { userId, workspaceId, role });
}

export function createInvitationSentEvent(actorId: string, invitationId: string, workspaceId: string, email: string, role: string): InvitationSentEvent {
  return createIdentityEvent("identity:invitation:sent", actorId, { invitationId, workspaceId, email, role });
}

export function createMembershipRoleChangedEvent(actorId: string, userId: string, workspaceId: string, previousRole: string, newRole: string): MembershipRoleChangedEvent {
  return createIdentityEvent("identity:membership:role-changed", actorId, { userId, workspaceId, previousRole, newRole });
}

export function createMembershipRemovedEvent(actorId: string, userId: string, workspaceId: string): MembershipRemovedEvent {
  return createIdentityEvent("identity:membership:removed", actorId, { userId, workspaceId });
}

export function createInvitationAcceptedEvent(actorId: string, invitationId: string, userId: string, workspaceId: string): InvitationAcceptedEvent {
  return createIdentityEvent("identity:invitation:accepted", actorId, { invitationId, userId, workspaceId });
}
