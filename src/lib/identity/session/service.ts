import { IdentitySession, SessionStatus } from "../types";
import { SessionExpiredError, SessionRevokedError, InvalidTokenError } from "../errors";
import { IdentityEventDispatcher, createSessionCreatedEvent, createSessionRevokedEvent } from "../events";
import { CreateSessionInput } from "./types";
import { DEFAULT_IDENTITY_CONFIG } from "../types";
import crypto from "crypto";

export interface SessionRepository {
  findById(id: string): Promise<IdentitySession | null>;
  findByToken(token: string): Promise<IdentitySession | null>;
  findByRefreshToken(refreshToken: string): Promise<IdentitySession | null>;
  findByUser(userId: string): Promise<IdentitySession[]>;
  create(input: IdentitySession): Promise<IdentitySession>;
  updateStatus(id: string, status: SessionStatus): Promise<void>;
  updateActivity(id: string): Promise<void>;
  delete(id: string): Promise<void>;
  deleteAllForUser(userId: string): Promise<void>;
}

export class SessionService {
  constructor(
    private readonly repository: SessionRepository,
    private readonly eventDispatcher: IdentityEventDispatcher
  ) {}

  async getSession(id: string): Promise<IdentitySession> {
    const session = await this.repository.findById(id);
    if (!session) throw new InvalidTokenError();
    return session;
  }

  async getUserSessions(userId: string): Promise<IdentitySession[]> {
    return this.repository.findByUser(userId);
  }

  async create(input: CreateSessionInput): Promise<IdentitySession> {
    const now = new Date();
    const expiresAt = input.expiresAt ?? new Date(
      now.getTime() + DEFAULT_IDENTITY_CONFIG.sessionMaxAge * 1000
    );

    const session: IdentitySession = {
      id: crypto.randomUUID(),
      userId: input.userId,
      token: crypto.randomBytes(48).toString("hex"),
      refreshToken: crypto.randomBytes(48).toString("hex"),
      deviceInfo: input.deviceInfo ?? null,
      ipAddress: input.ipAddress ?? null,
      lastActivityAt: now,
      expiresAt,
      status: "active",
      createdAt: now,
    };

    const created = await this.repository.create(session);

    this.eventDispatcher.emit(
      createSessionCreatedEvent(input.userId, input.userId, session.id)
    );

    return created;
  }

  async validate(token: string): Promise<IdentitySession> {
    const session = await this.repository.findByToken(token);
    if (!session) throw new InvalidTokenError();

    if (session.status === "expired" || session.expiresAt < new Date()) {
      throw new SessionExpiredError();
    }

    if (session.status === "revoked") {
      throw new SessionRevokedError();
    }

    await this.repository.updateActivity(session.id);
    return session;
  }

  async refresh(refreshToken: string): Promise<IdentitySession> {
    const session = await this.repository.findByRefreshToken(refreshToken);
    if (!session) throw new InvalidTokenError();

    if (session.status === "revoked") {
      throw new SessionRevokedError();
    }

    if (session.expiresAt < new Date()) {
      await this.repository.updateStatus(session.id, "expired");
      throw new SessionExpiredError();
    }

    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + DEFAULT_IDENTITY_CONFIG.sessionMaxAge * 1000);

    const updated: IdentitySession = {
      ...session,
      token: crypto.randomBytes(48).toString("hex"),
      refreshToken: crypto.randomBytes(48).toString("hex"),
      lastActivityAt: now,
      expiresAt: newExpiresAt,
    };

    return updated;
  }

  async revoke(id: string, actorId: string, reason = "manual_revoke"): Promise<void> {
    const session = await this.getSession(id);
    await this.repository.updateStatus(id, "revoked");

    this.eventDispatcher.emit(
      createSessionRevokedEvent(actorId, session.userId, id, reason)
    );
  }

  async revokeAllForUser(userId: string, actorId: string): Promise<void> {
    const sessions = await this.repository.findByUser(userId);
    for (const session of sessions) {
      if (session.status === "active") {
        await this.repository.updateStatus(session.id, "revoked");
        this.eventDispatcher.emit(
          createSessionRevokedEvent(actorId, userId, session.id, "all_sessions_revoked")
        );
      }
    }
  }

  async delete(id: string): Promise<void> {
    await this.getSession(id);
    await this.repository.delete(id);
  }
}
