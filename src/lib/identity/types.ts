export type AuthProvider = "email" | "google" | "github" | "magic_link";

export type PlatformRole = "super_admin" | "agency_admin" | "agency_member" | "creator_owner" | "creator_member" | "viewer";

export type WorkspaceRole = "owner" | "admin" | "member" | "viewer";

export type WorkspaceType = "creator" | "agency" | "super_admin";

export type WorkspaceStatus = "active" | "suspended" | "closed";

export type OrganizationType = "individual" | "agency" | "enterprise";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type SessionStatus = "active" | "expired" | "revoked";

export interface IdentityUser {
  readonly id: string;
  readonly email: string;
  readonly name: string | null;
  readonly avatarUrl: string | null;
  readonly emailVerified: boolean;
  readonly authProvider: AuthProvider;
  readonly platformRole: PlatformRole;
  readonly lastLoginAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface Organization {
  readonly id: string;
  readonly name: string;
  readonly type: OrganizationType;
  readonly ownerId: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface IdentityWorkspace {
  readonly id: string;
  readonly organizationId: string;
  readonly name: string;
  readonly slug: string;
  readonly type: WorkspaceType;
  readonly status: WorkspaceStatus;
  readonly isFreelancer: boolean;
  readonly onboardingCompleted: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WorkspaceMember {
  readonly id: string;
  readonly workspaceId: string;
  readonly userId: string;
  readonly role: WorkspaceRole;
  readonly joinedAt: Date;
  readonly invitedAt: Date | null;
}

export interface WorkspaceInvitation {
  readonly id: string;
  readonly workspaceId: string;
  readonly email: string;
  readonly role: WorkspaceRole;
  readonly token: string;
  readonly invitedByUserId: string;
  readonly status: InvitationStatus;
  readonly expiresAt: Date;
  readonly acceptedAt: Date | null;
  readonly createdAt: Date;
}

export interface IdentitySession {
  readonly id: string;
  readonly userId: string;
  readonly token: string;
  readonly refreshToken: string;
  readonly deviceInfo: string | null;
  readonly ipAddress: string | null;
  readonly lastActivityAt: Date;
  readonly expiresAt: Date;
  readonly status: SessionStatus;
  readonly createdAt: Date;
}

export interface AuthCredentials {
  readonly email: string;
  readonly password: string;
}

export interface AuthRegistration {
  readonly email: string;
  readonly password: string;
  readonly name: string;
  readonly persona: "creator" | "agency";
}

export interface AuthTokenPair {
  readonly accessToken: string;
  readonly refreshToken: string;
  readonly expiresAt: Date;
}

export interface AuthResult {
  readonly user: IdentityUser;
  readonly session: IdentitySession;
  readonly workspace: IdentityWorkspace;
  readonly isNewUser: boolean;
}

export interface Permission {
  readonly action: string;
  readonly resource: string;
}

export interface RoleDefinition {
  readonly name: string;
  readonly platformRole: PlatformRole;
  readonly permissions: readonly string[];
  readonly isSystem: boolean;
  readonly description: string;
}

export interface ResourcePolicy {
  readonly resourceType: string;
  readonly ownerField: string;
  readonly workspaceField: string;
}

export interface IdentityConfig {
  readonly sessionMaxAge: number;
  readonly refreshTokenMaxAge: number;
  readonly invitationExpiresInHours: number;
  readonly maxFailedAttempts: number;
  readonly lockoutDurationMinutes: number;
  readonly passwordMinLength: number;
  readonly bcryptRounds: number;
}

export const DEFAULT_IDENTITY_CONFIG: IdentityConfig = {
  sessionMaxAge: 7 * 24 * 60 * 60,
  refreshTokenMaxAge: 30 * 24 * 60 * 60,
  invitationExpiresInHours: 48,
  maxFailedAttempts: 5,
  lockoutDurationMinutes: 15,
  passwordMinLength: 8,
  bcryptRounds: 12,
};
