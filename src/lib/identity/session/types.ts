import { IdentitySession, SessionStatus } from "../types";

export interface CreateSessionInput {
  readonly userId: string;
  readonly deviceInfo?: string;
  readonly ipAddress?: string;
  readonly expiresAt?: Date;
}

export interface RefreshSessionInput {
  readonly refreshToken: string;
}

export type { IdentitySession, SessionStatus };
