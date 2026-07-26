import { randomUUID } from "crypto";
import type { CorrelationContext, CreateCorrelationInput } from "./types";
import { UNCORRELATED, isCorrelationContext } from "./types";

export function createCorrelationContext(input?: CreateCorrelationInput): CorrelationContext {
  return {
    correlationId: randomUUID(),
    workflowId: input?.workflowId,
    generationSessionId: input?.generationSessionId,
    workspaceId: input?.workspaceId,
    creatorId: input?.creatorId,
    requestId: input?.requestId,
    createdAt: new Date(),
  };
}

export function createCorrelationContextWithId(
  correlationId: string,
  input?: CreateCorrelationInput,
): CorrelationContext {
  return {
    correlationId,
    workflowId: input?.workflowId,
    generationSessionId: input?.generationSessionId,
    workspaceId: input?.workspaceId,
    creatorId: input?.creatorId,
    requestId: input?.requestId,
    createdAt: new Date(),
  };
}

export function forkCorrelationContext(
  parent: CorrelationContext,
  overrides?: Partial<CorrelationContext>,
): CorrelationContext {
  return {
    ...parent,
    ...overrides,
    correlationId: overrides?.correlationId ?? parent.correlationId,
    createdAt: parent.createdAt,
  };
}

export function safeCorrelationId(context?: CorrelationContext | null): string {
  return context?.correlationId ?? UNCORRELATED;
}

export function validateCorrelationContext(context: unknown): context is CorrelationContext {
  if (!isCorrelationContext(context)) return false;
  if (!context.correlationId || context.correlationId === UNCORRELATED) return false;
  return true;
}

export function serializeCorrelationContext(context: CorrelationContext): string {
  return JSON.stringify({
    ...context,
    createdAt: context.createdAt.toISOString(),
  });
}

export function deserializeCorrelationContext(json: string): CorrelationContext {
  const parsed = JSON.parse(json);
  return {
    ...parsed,
    createdAt: new Date(parsed.createdAt),
  } satisfies CorrelationContext;
}
