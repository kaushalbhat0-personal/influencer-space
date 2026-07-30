import type { NextRequest } from "next/server";
import { correlationFromHeaders, correlationToHeaders } from "./middleware";
import { correlationService } from "./service";
import type { CorrelationContext } from "./types";

export function correlationFromRequest(request: NextRequest): CorrelationContext {
  return correlationFromHeaders(request.headers);
}

export function correlationToResponseHeaders(context: CorrelationContext): Record<string, string> {
  return correlationToHeaders(context);
}

export type CorrelationHandler<T = unknown> = (
  context: CorrelationContext,
  ...args: unknown[]
) => Promise<T>;

export function withCorrelation<T>(
  handler: (context: CorrelationContext) => Promise<T>,
): (request: NextRequest) => Promise<Response> {
  return async (request: NextRequest) => {
    const context = correlationFromRequest(request);
    const result = await handler(context);
    const headers = correlationToResponseHeaders(context);
    if (result instanceof Response) {
      for (const [key, value] of Object.entries(headers)) {
        result.headers.set(key, value);
      }
      return result;
    }
    return Response.json(result, { headers });
  };
}

export function createActionCorrelation(
  overrides?: Partial<Pick<CorrelationContext, "workspaceId" | "creatorId" | "workflowId">>,
): CorrelationContext {
  return correlationService.create(overrides);
}
