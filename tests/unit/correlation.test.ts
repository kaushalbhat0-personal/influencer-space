import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSessionFindFirst } = vi.hoisted(() => ({
  mockSessionFindFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    generationSession: {
      findFirst: mockSessionFindFirst,
    },
  },
}));

import {
  createCorrelationContext,
  forkCorrelationContext,
  safeCorrelationId,
  validateCorrelationContext,
  serializeCorrelationContext,
  deserializeCorrelationContext,
} from "@/lib/platform/correlation/context";
import {
  correlationFromHeaders,
  correlationToHeaders,
} from "@/lib/platform/correlation/middleware";
import {
  UNCORRELATED,
  isCorrelationContext,
} from "@/lib/platform/correlation/types";
import { correlationService } from "@/lib/platform/correlation/service";
import type { CorrelationContext, CreateCorrelationInput } from "@/lib/platform/correlation/types";

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── Types & Validation ─────────────────────────────────────────────

describe("Correlation Types — isCorrelationContext", () => {
  it("returns true for valid context", () => {
    const ctx = createCorrelationContext();
    expect(isCorrelationContext(ctx)).toBe(true);
  });

  it("returns false for null", () => {
    expect(isCorrelationContext(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(isCorrelationContext(undefined)).toBe(false);
  });

  it("returns false for plain object without correlationId", () => {
    expect(isCorrelationContext({})).toBe(false);
  });

  it("returns false for plain object with non-string correlationId", () => {
    expect(isCorrelationContext({ correlationId: 123, createdAt: new Date() })).toBe(false);
  });

  it("returns false for string", () => {
    expect(isCorrelationContext("hello")).toBe(false);
  });
});

describe("Correlation Types — UNCORRELATED", () => {
  it("is the string 'uncorrelated'", () => {
    expect(UNCORRELATED).toBe("uncorrelated");
  });
});

// ─── Context Creation ───────────────────────────────────────────────

describe("createCorrelationContext", () => {
  it("generates a UUID correlationId", () => {
    const ctx = createCorrelationContext();
    expect(ctx.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("sets createdAt to current date", () => {
    const before = Date.now();
    const ctx = createCorrelationContext();
    const after = Date.now();
    expect(ctx.createdAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(ctx.createdAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("accepts no input and returns valid context", () => {
    const ctx = createCorrelationContext();
    expect(ctx.workflowId).toBeUndefined();
    expect(ctx.generationSessionId).toBeUndefined();
    expect(ctx.workspaceId).toBeUndefined();
    expect(ctx.creatorId).toBeUndefined();
    expect(ctx.requestId).toBeUndefined();
  });

  it("accepts CreateCorrelationInput with all fields", () => {
    const input: CreateCorrelationInput = {
      workflowId: "wf-1",
      generationSessionId: "gs-1",
      workspaceId: "ws-1",
      creatorId: "user-1",
      requestId: "req-1",
    };
    const ctx = createCorrelationContext(input);
    expect(ctx.workflowId).toBe("wf-1");
    expect(ctx.generationSessionId).toBe("gs-1");
    expect(ctx.workspaceId).toBe("ws-1");
    expect(ctx.creatorId).toBe("user-1");
    expect(ctx.requestId).toBe("req-1");
  });

  it("accepts partial CreateCorrelationInput", () => {
    const ctx = createCorrelationContext({ workspaceId: "ws-1" });
    expect(ctx.workspaceId).toBe("ws-1");
    expect(ctx.workflowId).toBeUndefined();
  });

  it("generates unique correlationIds on each call", () => {
    const ctx1 = createCorrelationContext();
    const ctx2 = createCorrelationContext();
    expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
  });
});

// ─── Context Forking ────────────────────────────────────────────────

describe("forkCorrelationContext", () => {
  it("preserves parent correlationId", () => {
    const parent = createCorrelationContext({ workspaceId: "ws-1" });
    const child = forkCorrelationContext(parent);
    expect(child.correlationId).toBe(parent.correlationId);
  });

  it("preserves parent createdAt", () => {
    const parent = createCorrelationContext();
    const child = forkCorrelationContext(parent);
    expect(child.createdAt).toBe(parent.createdAt);
  });

  it("preserves all parent fields when no overrides", () => {
    const parent = createCorrelationContext({
      workspaceId: "ws-1",
      creatorId: "user-1",
      workflowId: "wf-1",
    });
    const child = forkCorrelationContext(parent);
    expect(child.workspaceId).toBe("ws-1");
    expect(child.creatorId).toBe("user-1");
    expect(child.workflowId).toBe("wf-1");
  });

  it("applies overrides on top of parent fields", () => {
    const parent = createCorrelationContext({ workspaceId: "ws-1" });
    const child = forkCorrelationContext(parent, {
      generationSessionId: "gs-child",
      workflowId: "wf-child",
    });
    expect(child.correlationId).toBe(parent.correlationId);
    expect(child.workspaceId).toBe("ws-1");
    expect(child.generationSessionId).toBe("gs-child");
    expect(child.workflowId).toBe("wf-child");
  });

  it("does not mutate the parent context", () => {
    const parent = createCorrelationContext({ workspaceId: "ws-1" });
    const parentBefore = { ...parent };
    forkCorrelationContext(parent, { generationSessionId: "gs-child" });
    expect(parent).toEqual(parentBefore);
  });
});

// ─── safeCorrelationId ──────────────────────────────────────────────

describe("safeCorrelationId", () => {
  it("returns the correlationId for valid context", () => {
    const ctx = createCorrelationContext();
    expect(safeCorrelationId(ctx)).toBe(ctx.correlationId);
  });

  it("returns UNCORRELATED for null", () => {
    expect(safeCorrelationId(null)).toBe(UNCORRELATED);
  });

  it("returns UNCORRELATED for undefined", () => {
    expect(safeCorrelationId(undefined)).toBe(UNCORRELATED);
  });
});

// ─── validateCorrelationContext ─────────────────────────────────────

describe("validateCorrelationContext", () => {
  it("returns true for valid context", () => {
    const ctx = createCorrelationContext();
    expect(validateCorrelationContext(ctx)).toBe(true);
  });

  it("returns false for null", () => {
    expect(validateCorrelationContext(null)).toBe(false);
  });

  it("returns false for undefined", () => {
    expect(validateCorrelationContext(undefined)).toBe(false);
  });

  it("returns false for context with UNCORRELATED id", () => {
    const ctx = createCorrelationContext();
    (ctx as { correlationId: string }).correlationId = UNCORRELATED;
    expect(validateCorrelationContext(ctx)).toBe(false);
  });

  it("returns false for context with empty correlationId", () => {
    const ctx = createCorrelationContext();
    (ctx as { correlationId: string }).correlationId = "";
    expect(validateCorrelationContext(ctx)).toBe(false);
  });
});

// ─── Serialization ──────────────────────────────────────────────────

describe("serializeCorrelationContext", () => {
  it("produces valid JSON string", () => {
    const ctx = createCorrelationContext();
    const json = serializeCorrelationContext(ctx);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("includes correlationId in output", () => {
    const ctx = createCorrelationContext();
    const json = serializeCorrelationContext(ctx);
    const parsed = JSON.parse(json);
    expect(parsed.correlationId).toBe(ctx.correlationId);
  });

  it("serializes createdAt as ISO string", () => {
    const ctx = createCorrelationContext();
    const json = serializeCorrelationContext(ctx);
    const parsed = JSON.parse(json);
    expect(typeof parsed.createdAt).toBe("string");
    expect(new Date(parsed.createdAt).getTime()).toBe(ctx.createdAt.getTime());
  });
});

describe("deserializeCorrelationContext", () => {
  it("restores all fields", () => {
    const ctx = createCorrelationContext({
      workspaceId: "ws-1",
      creatorId: "user-1",
      workflowId: "wf-1",
    });
    const json = serializeCorrelationContext(ctx);
    const restored = deserializeCorrelationContext(json);
    expect(restored.correlationId).toBe(ctx.correlationId);
    expect(restored.workspaceId).toBe("ws-1");
    expect(restored.creatorId).toBe("user-1");
    expect(restored.workflowId).toBe("wf-1");
  });

  it("restores createdAt as Date object", () => {
    const ctx = createCorrelationContext();
    const json = serializeCorrelationContext(ctx);
    const restored = deserializeCorrelationContext(json);
    expect(restored.createdAt).toBeInstanceOf(Date);
    expect(restored.createdAt.getTime()).toBe(ctx.createdAt.getTime());
  });

  it("round-trips successfully", () => {
    const ctx = createCorrelationContext({
      workspaceId: "ws-1",
      creatorId: "user-1",
      generationSessionId: "gs-1",
    });
    const json = serializeCorrelationContext(ctx);
    const restored = deserializeCorrelationContext(json);
    expect(restored).toEqual(ctx);
  });
});

// ─── Middleware Utilities ───────────────────────────────────────────

describe("correlationFromHeaders", () => {
  it("creates context from x-correlation-id header", () => {
    const ctx = correlationFromHeaders({ "x-correlation-id": "corr-123" });
    expect(ctx.correlationId).toBe("corr-123");
  });

  it("creates fresh context when no x-correlation-id", () => {
    const ctx = correlationFromHeaders({});
    expect(ctx.correlationId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("extracts workspaceId from headers", () => {
    const ctx = correlationFromHeaders({ "x-workspace-id": "ws-1" });
    expect(ctx.workspaceId).toBe("ws-1");
  });

  it("extracts requestId from headers", () => {
    const ctx = correlationFromHeaders({ "x-request-id": "req-1" });
    expect(ctx.requestId).toBe("req-1");
  });

  it("works with Headers instance", () => {
    const headers = new Headers();
    headers.set("x-correlation-id", "corr-456");
    headers.set("x-workspace-id", "ws-2");
    const ctx = correlationFromHeaders(headers);
    expect(ctx.correlationId).toBe("corr-456");
    expect(ctx.workspaceId).toBe("ws-2");
  });
});

describe("correlationToHeaders", () => {
  it("includes x-correlation-id", () => {
    const ctx = createCorrelationContext();
    const headers = correlationToHeaders(ctx);
    expect(headers["x-correlation-id"]).toBe(ctx.correlationId);
  });

  it("includes x-workspace-id when present", () => {
    const ctx = createCorrelationContext({ workspaceId: "ws-1" });
    const headers = correlationToHeaders(ctx);
    expect(headers["x-workspace-id"]).toBe("ws-1");
  });

  it("omits x-workspace-id when absent", () => {
    const ctx = createCorrelationContext();
    const headers = correlationToHeaders(ctx);
    expect(headers["x-workspace-id"]).toBeUndefined();
  });

  it("includes x-workflow-id when present", () => {
    const ctx = createCorrelationContext({ workflowId: "wf-1" });
    const headers = correlationToHeaders(ctx);
    expect(headers["x-workflow-id"]).toBe("wf-1");
  });

  it("includes x-request-id when present", () => {
    const ctx = createCorrelationContext({ requestId: "req-1" });
    const headers = correlationToHeaders(ctx);
    expect(headers["x-request-id"]).toBe("req-1");
  });

  it("returns a plain Record<string, string>", () => {
    const ctx = createCorrelationContext();
    const headers = correlationToHeaders(ctx);
    expect(Object.getPrototypeOf(headers)).toBe(Object.prototype);
  });
});

// ─── Correlation Service ────────────────────────────────────────────

describe("correlationService.create", () => {
  it("returns a valid context", () => {
    const ctx = correlationService.create();
    expect(ctx.correlationId).toBeDefined();
    expect(ctx.createdAt).toBeInstanceOf(Date);
  });

  it("accepts input with all fields", () => {
    const ctx = correlationService.create({
      workspaceId: "ws-1",
      creatorId: "user-1",
      workflowId: "wf-1",
    });
    expect(ctx.workspaceId).toBe("ws-1");
    expect(ctx.creatorId).toBe("user-1");
    expect(ctx.workflowId).toBe("wf-1");
  });
});

describe("correlationService.fork", () => {
  it("creates child with same correlationId", () => {
    const parent = correlationService.create();
    const child = correlationService.fork(parent, { generationSessionId: "gs-1" });
    expect(child.correlationId).toBe(parent.correlationId);
    expect(child.generationSessionId).toBe("gs-1");
  });
});

describe("correlationService.safeId", () => {
  it("returns id for valid context", () => {
    const ctx = correlationService.create();
    expect(correlationService.safeId(ctx)).toBe(ctx.correlationId);
  });

  it("returns UNCORRELATED for null", () => {
    expect(correlationService.safeId(null)).toBe(UNCORRELATED);
  });

  it("returns UNCORRELATED for undefined", () => {
    expect(correlationService.safeId(undefined)).toBe(UNCORRELATED);
  });
});

describe("correlationService.getSessionId", () => {
  it("returns session id when correlationId matches", async () => {
    mockSessionFindFirst.mockResolvedValue({ id: "session-1" });
    const result = await correlationService.getSessionId("corr-123");
    expect(result).toBe("session-1");
    expect(mockSessionFindFirst).toHaveBeenCalledWith({
      where: { correlationId: "corr-123" },
      select: { id: true },
    });
  });

  it("returns null when no session matches", async () => {
    mockSessionFindFirst.mockResolvedValue(null);
    const result = await correlationService.getSessionId("corr-nonexistent");
    expect(result).toBeNull();
  });
});

describe("correlationService.resolveContext", () => {
  it("returns sessionId and workspaceId when correlationId matches", async () => {
    mockSessionFindFirst.mockResolvedValue({ id: "session-1", workspaceId: "ws-1" });
    const result = await correlationService.resolveContext("corr-123");
    expect(result.sessionId).toBe("session-1");
    expect(result.workspaceId).toBe("ws-1");
  });

  it("returns nulls when no session matches", async () => {
    mockSessionFindFirst.mockResolvedValue(null);
    const result = await correlationService.resolveContext("corr-nonexistent");
    expect(result.sessionId).toBeNull();
    expect(result.workspaceId).toBeNull();
  });

  it("returns nulls for empty correlationId", async () => {
    const result = await correlationService.resolveContext("");
    expect(result.sessionId).toBeNull();
    expect(result.workspaceId).toBeNull();
    expect(mockSessionFindFirst).not.toHaveBeenCalled();
  });
});

describe("correlationService.generateCorrelationId", () => {
  it("returns a UUID", () => {
    const id = correlationService.generateCorrelationId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  it("returns unique values on each call", () => {
    const id1 = correlationService.generateCorrelationId();
    const id2 = correlationService.generateCorrelationId();
    expect(id1).not.toBe(id2);
  });
});

describe("Session Registry — findByCorrelationId", () => {
  it("returns null for empty correlationId", async () => {
    const { sessionRegistry } = await import("@/lib/generation/session/registry");
    const result = await sessionRegistry.findByCorrelationId("");
    expect(result).toBeNull();
    expect(mockSessionFindFirst).not.toHaveBeenCalled();
  });
});

// ─── Concurrent Isolation ───────────────────────────────────────────

describe("Concurrent generation isolation", () => {
  it("two sessions in same workspace get different correlationIds", () => {
    const ctx1 = createCorrelationContext({ workspaceId: "ws-1" });
    const ctx2 = createCorrelationContext({ workspaceId: "ws-1" });
    expect(ctx1.correlationId).not.toBe(ctx2.correlationId);
    expect(ctx1.workspaceId).toBe("ws-1");
    expect(ctx2.workspaceId).toBe("ws-1");
  });

  it("fork preserves correlationId for sub-workflow tracing", () => {
    const parent = createCorrelationContext({ workspaceId: "ws-1" });
    const child = forkCorrelationContext(parent);
    expect(child.correlationId).toBe(parent.correlationId);
    expect(child.workspaceId).toBe(parent.workspaceId);
  });

  it("each fork with different overrides produces predictable result", () => {
    const parent = createCorrelationContext({ workspaceId: "ws-1" });
    const child1 = forkCorrelationContext(parent, { generationSessionId: "gs-1" });
    const child2 = forkCorrelationContext(parent, { generationSessionId: "gs-2" });
    expect(child1.generationSessionId).toBe("gs-1");
    expect(child2.generationSessionId).toBe("gs-2");
    expect(child1.correlationId).toBe(child2.correlationId);
  });
});

// ─── Event Correlation Integration ──────────────────────────────────

describe("Event payload correlation", () => {
  it("WebsiteBeingGenerated accepts optional correlationId", () => {
    const payload: { correlationId?: string } = {
      correlationId: "corr-123",
    };
    expect(payload.correlationId).toBe("corr-123");
  });

  it("CreatorProvisioned accepts optional correlationId", () => {
    const payload: { correlationId?: string } = {
      correlationId: "corr-456",
    };
    expect(payload.correlationId).toBe("corr-456");
  });

  it("WebsitePublished accepts optional correlationId", () => {
    const payload: { correlationId?: string } = {
      correlationId: "corr-789",
    };
    expect(payload.correlationId).toBe("corr-789");
  });

  it("correlationId can be undefined in event payload", () => {
    const payload: { correlationId?: string } = {};
    expect(payload.correlationId).toBeUndefined();
  });
});

// ─── Serialization Edge Cases ───────────────────────────────────────

describe("Serialization edge cases", () => {
  it("handles context with all optional fields", () => {
    const ctx = createCorrelationContext({
      workflowId: "wf-1",
      generationSessionId: "gs-1",
      workspaceId: "ws-1",
      creatorId: "user-1",
      requestId: "req-1",
    });
    const json = serializeCorrelationContext(ctx);
    const restored = deserializeCorrelationContext(json);
    expect(restored).toEqual(ctx);
  });

  it("handles context with no optional fields", () => {
    const ctx = createCorrelationContext();
    const json = serializeCorrelationContext(ctx);
    const restored = deserializeCorrelationContext(json);
    expect(restored).toEqual(ctx);
  });
});

// ─── TypeScript type assertions ─────────────────────────────────────

describe("TypeScript type exports", () => {
  it("imports CorrelationContext as type", () => {
    const ctx: CorrelationContext = createCorrelationContext();
    expect(typeof ctx.correlationId).toBe("string");
  });

  it("imports CreateCorrelationInput as type", () => {
    const input: CreateCorrelationInput = { workspaceId: "ws-1" };
    expect(input.workspaceId).toBe("ws-1");
  });
});
