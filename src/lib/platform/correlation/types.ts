export interface CorrelationContext {
  correlationId: string;
  workflowId?: string;
  generationSessionId?: string;
  workspaceId?: string;
  creatorId?: string;
  requestId?: string;
  createdAt: Date;
}

export interface CreateCorrelationInput {
  workflowId?: string;
  generationSessionId?: string;
  workspaceId?: string;
  creatorId?: string;
  requestId?: string;
}

export const UNCORRELATED = "uncorrelated";

export function isCorrelationContext(value: unknown): value is CorrelationContext {
  if (!value || typeof value !== "object") return false;
  const c = value as Record<string, unknown>;
  return typeof c.correlationId === "string" && c.createdAt instanceof Date;
}
