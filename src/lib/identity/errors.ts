export class IdentityError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly statusCode: number = 400
  ) {
    super(message);
    this.name = "IdentityError";
  }
}

export class AuthenticationError extends IdentityError {
  constructor(message = "Invalid credentials") {
    super(message, "AUTHENTICATION_FAILED", 401);
    this.name = "AuthenticationError";
  }
}

export class AuthorizationError extends IdentityError {
  constructor(message = "Insufficient permissions") {
    super(message, "AUTHORIZATION_FAILED", 403);
    this.name = "AuthorizationError";
  }
}

export class UserNotFoundError extends IdentityError {
  constructor(email?: string) {
    super(
      email ? `User with email "${email}" not found` : "User not found",
      "USER_NOT_FOUND",
      404
    );
    this.name = "UserNotFoundError";
  }
}

export class UserAlreadyExistsError extends IdentityError {
  constructor(email: string) {
    super(
      `User with email "${email}" already exists`,
      "USER_ALREADY_EXISTS",
      409
    );
    this.name = "UserAlreadyExistsError";
  }
}

export class EmailNotVerifiedError extends IdentityError {
  constructor() {
    super("Email not verified", "EMAIL_NOT_VERIFIED", 403);
    this.name = "EmailNotVerifiedError";
  }
}

export class SessionExpiredError extends IdentityError {
  constructor() {
    super("Session has expired", "SESSION_EXPIRED", 401);
    this.name = "SessionExpiredError";
  }
}

export class SessionRevokedError extends IdentityError {
  constructor() {
    super("Session has been revoked", "SESSION_REVOKED", 401);
    this.name = "SessionRevokedError";
  }
}

export class WorkspaceNotFoundError extends IdentityError {
  constructor(id?: string) {
    super(
      id ? `Workspace "${id}" not found` : "Workspace not found",
      "WORKSPACE_NOT_FOUND",
      404
    );
    this.name = "WorkspaceNotFoundError";
  }
}

export class MembershipNotFoundError extends IdentityError {
  constructor() {
    super("Membership not found", "MEMBERSHIP_NOT_FOUND", 404);
    this.name = "MembershipNotFoundError";
  }
}

export class InvitationNotFoundError extends IdentityError {
  constructor() {
    super("Invitation not found", "INVITATION_NOT_FOUND", 404);
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends IdentityError {
  constructor() {
    super("Invitation has expired", "INVITATION_EXPIRED", 410);
    this.name = "InvitationExpiredError";
  }
}

export class AccountLockedError extends IdentityError {
  constructor(minutesRemaining: number) {
    super(
      `Account is locked. Try again in ${minutesRemaining} minutes`,
      "ACCOUNT_LOCKED",
      429
    );
    this.name = "AccountLockedError";
  }
}

export class InvalidTokenError extends IdentityError {
  constructor() {
    super("Invalid or malformed token", "INVALID_TOKEN", 401);
    this.name = "InvalidTokenError";
  }
}

export class OrganizationNotFoundError extends IdentityError {
  constructor(id?: string) {
    super(
      id ? `Organization "${id}" not found` : "Organization not found",
      "ORGANIZATION_NOT_FOUND",
      404
    );
    this.name = "OrganizationNotFoundError";
  }
}

export class ResourceOwnershipError extends IdentityError {
  constructor() {
    super("Resource does not belong to this workspace", "RESOURCE_OWNERSHIP", 403);
    this.name = "ResourceOwnershipError";
  }
}

export class TenantIsolationError extends IdentityError {
  constructor() {
    super("Cross-tenant access denied", "TENANT_ISOLATION", 403);
    this.name = "TenantIsolationError";
  }
}
