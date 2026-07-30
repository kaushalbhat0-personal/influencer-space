import { IdentitySession, SessionStatus } from "../types";
import { SessionExpiredError, SessionRevokedError, InvalidTokenError } from "../errors";
import { IdentityEventDispatcher, createSessionCreatedEvent, createSessionRevokedEvent } from "../events";
import { CreateSessionInput } from "./types";
import { DEFAULT_IDENTITY_CONFIG } from "../types";
import crypto from "crypto";
import { logger } from "@/lib/observability/logger";
import { captureError } from "@/lib/observability/error-tracker";
import { metricsService } from "@/lib/observability/metrics-service";

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
    const start = Date.now();
    logger.info("Session create started", "identity", { operation: "session_create", metadata: { userId: input.userId } as Record<string, unknown> });
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

    logger.info("Session create completed", "identity", { operation: "session_create", duration: Date.now() - start, metadata: { result: "success", sessionId: session.id, userId: input.userId } as Record<string, unknown> });
    metricsService.recordDuration("provision", Date.now() - start);
    return created;
  }

  async validate(token: string): Promise<IdentitySession> {
    const start = Date.now();
    logger.info("Session validate started", "identity", { operation: "session_validate", metadata: {} as Record<string, unknown> });
    const session = await this.repository.findByToken(token);
    if (!session) {
      const error = new InvalidTokenError();
      captureError(error, { service: "identity", operation: "session_validate" });
      throw error;
    }

    if (session.status === "expired" || session.expiresAt < new Date()) {
      const error = new SessionExpiredError();
      captureError(error, { service: "identity", operation: "session_validate" });
      throw error;
    }

    if (session.status === "revoked") {
      const error = new SessionRevokedError();
      captureError(error, { service: "identity", operation: "session_validate" });
      throw error;
    }

    await this.repository.updateActivity(session.id);
    logger.info("Session validate completed", "identity", { operation: "session_validate", duration: Date.now() - start, metadata: { result: "success", sessionId: session.id } as Record<string, unknown> });
    metricsService.recordDuration("provision", Date.now() - start);
    return session;
  }

  async refresh(refreshToken: string): Promise<IdentitySession> {
    const start = Date.now();
    logger.info("Session refresh started", "identity", { operation: "session_refresh", metadata: {} as Record<string, unknown> });
    const session = await this.repository.findByRefreshToken(refreshToken);
    if (!session) {
      const error = new InvalidTokenError();
      captureError(error, { service: "identity", operation: "session_refresh" });
      throw error;
    }

    if (session.status === "revoked") {
      const error = new SessionRevokedError();
      captureError(error, { service: "identity", operation: "session_refresh" });
      throw error;
    }

    if (session.expiresAt < new Date()) {
      await this.repository.updateStatus(session.id, "expired");
      const error = new SessionExpiredError();
      captureError(error, { service: "identity", operation: "session_refresh" });
      throw error;
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

    logger.info("Session refresh completed", "identity", { operation: "session_refresh", duration: Date.now() - start, metadata: { result: "success", sessionId: session.id } as Record<string, unknown> });
    metricsService.recordDuration("provision", Date.now() - start);
    return updated;
  }

  async revoke(id: string, actorId: string, reason = "manual_revoke"): Promise<void> {
    const start = Date.now();
    logger.info("Session revoke started", "identity", { operation: "session_revoke", metadata: { sessionId: id, actorId, reason } as Record<string, unknown> });
    const session = await this.getSession(id);
    await this.repository.updateStatus(id, "revoked");

    this.eventDispatcher.emit(
      createSessionRevokedEvent(actorId, session.userId, id, reason)
    );

    logger.info("Session revoke completed", "identity", { operation: "session_revoke", duration: Date.now() - start, metadata: { result: "success", sessionId: id, userId: session.userId } as Record<string, unknown> });
    metricsService.recordDuration("provision", Date.now() - start);
  }

  async revokeAllForUser(userId: string, actorId: string): Promise<void> {
    const start = Date.now();
    logger.info("Session revokeAll started", "identity", { operation: "session_revoke_all", metadata: { userId, actorId } as Record<string, unknown> });
    const sessions = await this.repository.findByUser(userId);
    for (const session of sessions) {
      if (session.status === "active") {
        await this.repository.updateStatus(session.id, "revoked");
        this.eventDispatcher.emit(
          createSessionRevokedEvent(actorId, userId, session.id, "all_sessions_revoked")
        );
      }
    }
    logger.info("Session revokeAll completed", "identity", { operation: "session_revoke_all", duration: Date.now() - start, metadata: { result: "success", userId, sessionsRevoked: sessions.filter(s => s.status === "active").length } as Record<string, unknown> });
    metricsService.recordDuration("provision", Date.now() - start);
  }

  async delete(id: string): Promise<void> {
    await this.getSession(id);
    await this.repository.delete(id);
  }
}
