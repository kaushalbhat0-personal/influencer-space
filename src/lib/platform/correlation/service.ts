import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { createCorrelationContext, forkCorrelationContext, safeCorrelationId } from "./context";
import type { CorrelationContext, CreateCorrelationInput } from "./types";

export const correlationService = {
  create(input?: CreateCorrelationInput): CorrelationContext {
    return createCorrelationContext(input);
  },

  fork(parent: CorrelationContext, overrides?: Partial<CorrelationContext>): CorrelationContext {
    return forkCorrelationContext(parent, overrides);
  },

  safeId(context?: CorrelationContext | null): string {
    return safeCorrelationId(context);
  },

  async getSessionId(correlationId: string): Promise<string | null> {
    const session = await prisma.generationSession.findFirst({
      where: { correlationId },
      select: { id: true },
    });
    return session?.id ?? null;
  },

  async resolveContext(correlationId: string): Promise<{
    sessionId: string | null;
    workspaceId: string | null;
  }> {
    const session = correlationId
      ? await prisma.generationSession.findFirst({
          where: { correlationId },
          select: { id: true, workspaceId: true },
        })
      : null;
    return {
      sessionId: session?.id ?? null,
      workspaceId: session?.workspaceId ?? null,
    };
  },

  generateCorrelationId(): string {
    return randomUUID();
  },
};

export type CorrelationService = typeof correlationService;
