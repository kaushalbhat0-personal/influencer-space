import type { CorrelationContext } from "./types";
import { createCorrelationContext, createCorrelationContextWithId } from "./context";

export function correlationFromHeaders(headers: Headers | Record<string, string>): CorrelationContext {
  const get = (key: string) => {
    if (headers instanceof Headers) return headers.get(key) ?? undefined;
    return (headers as Record<string, string>)[key];
  };

  const existingId = get("x-correlation-id");
  if (existingId) {
    return createCorrelationContextWithId(existingId, {
      requestId: get("x-request-id"),
      workspaceId: get("x-workspace-id"),
      workflowId: get("x-workflow-id"),
    });
  }

  return createCorrelationContext({
    requestId: get("x-request-id"),
    workspaceId: get("x-workspace-id"),
    workflowId: get("x-workflow-id"),
  });
}

export function correlationToHeaders(context: CorrelationContext): Record<string, string> {
  const headers: Record<string, string> = {
    "x-correlation-id": context.correlationId,
  };
  if (context.workspaceId) headers["x-workspace-id"] = context.workspaceId;
  if (context.workflowId) headers["x-workflow-id"] = context.workflowId;
  if (context.requestId) headers["x-request-id"] = context.requestId;
  return headers;
}
