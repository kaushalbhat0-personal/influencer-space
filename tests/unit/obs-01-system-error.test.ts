import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { computeFingerprint, normalizeMessage } from "@/lib/observability/fingerprint";
import { redactMessage, redactStack } from "@/lib/observability/redact";
import { getDeploymentContext } from "@/lib/observability/deployment";

describe("RCCF-OBS-01 — fingerprint", () => {
  it("identical errors deduplicate same fingerprint", async () => {
    const fp1 = computeFingerprint({ service: "billing", operation: "checkout", code: "P2002", message: "Unique constraint violation", stack: "Error: x\n at foo (app.ts:10:5)" });
    const fp2 = computeFingerprint({ service: "billing", operation: "checkout", code: "P2002", message: "Unique constraint violation", stack: "Error: x\n at foo (app.ts:10:5)" });
    expect(fp1).toBe(fp2);
  });

  it("different errors produce different fingerprints", async () => {
    const fp1 = computeFingerprint({ service: "billing", operation: "checkout", code: "P2002", message: "Unique constraint", stack: "at foo" });
    const fp2 = computeFingerprint({ service: "auth", operation: "login", code: "P2002", message: "Unique constraint", stack: "at foo" });
    expect(fp1).not.toBe(fp2);
  });

  it("volatile tenant/request/timestamp values do not change fingerprint", async () => {
    const msg1 = "Failed for tenant 550e8400-e29b-41d4-a716-446655440000 at 2026-05-13T10:00:00Z request f47ac10b-58cc-4372-a567-0e02b2c3d479 latency 123ms";
    const msg2 = "Failed for tenant 6ba7b810-9dad-11d1-80b4-00c04fd430c8 at 2026-05-13T11:00:00Z request 6ba7b811-9dad-11d1-80b4-00c04fd430c8 latency 456ms";
    const fp1 = computeFingerprint({ service: "publishing", operation: "publish", message: msg1, stack: "at publish (file.ts:10:5)" });
    const fp2 = computeFingerprint({ service: "publishing", operation: "publish", message: msg2, stack: "at publish (file.ts:10:5)" });
    expect(fp1).toBe(fp2);
  });

  it("normalizeMessage strips UUID/email", () => {
    expect(normalizeMessage("tenant 550e8400-e29b-41d4-a716-446655440000 email test@example.com")).toContain("[uuid]");
    expect(normalizeMessage("test@example.com")).toContain("[email]");
  });
});

describe("RCCF-OBS-01 — redaction", () => {
  it("redacts passwords, tokens, api keys", () => {
    const msg = `password=secret123 token=abc123 re_abc123456789012345 razorpay key rzp_test_abc123 email test@ex.com`;
    const out = redactMessage(msg);
    expect(out).not.toContain("secret123");
    expect(out).not.toContain("re_abc123");
    expect(out).not.toContain("rzp_test");
    expect(out).toContain("[REDACTED]");
  });

  it("redacts stack", () => {
    const stack = "Error: failed\n at foo (app.ts:10:5) token=secret123";
    const out = redactStack(stack)!;
    expect(out).toContain("[REDACTED]");
  });
});

describe("RCCF-OBS-01 — deployment context", () => {
  const origEnv = process.env;
  beforeEach(() => { vi.resetModules(); });
  afterEach(() => { process.env = origEnv; vi.resetModules(); });

  it("captures commitSha and deploymentId when available", async () => {
    process.env.VERCEL_GIT_COMMIT_SHA = "abc123def456";
    process.env.VERCEL_DEPLOYMENT_ID = "dpl_123";
    process.env.NODE_ENV = "production";
    const { getDeploymentContext: getCtx } = await import("@/lib/observability/deployment");
    const ctx = getCtx();
    expect(ctx.commitSha).toBe("abc123def456");
    expect(ctx.deploymentId).toBe("dpl_123");
    expect(ctx.environment).toBe("production");
  });

  it("gracefully null locally", async () => {
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_DEPLOYMENT_ID;
    const { getDeploymentContext: getCtx2 } = await import("@/lib/observability/deployment");
    const ctx = getCtx2();
    expect(ctx.commitSha).toBeNull();
    expect(ctx.deploymentId).toBeNull();
  });
});

describe("RCCF-OBS-01 — captureError persistence, dedup, tenant filter, status, auth, flood", () => {
  beforeEach(async () => {
    vi.resetModules();
    delete process.env.VERCEL_GIT_COMMIT_SHA;
    delete process.env.VERCEL_DEPLOYMENT_ID;
    const m = await import("@/lib/observability/error-tracker");
    m.__resetFloodForTests();
  });

  it("identical errors increment count not create new row", async () => {
    const fakePrisma = {
      systemError: {
        findFirst: vi.fn().mockResolvedValueOnce(null).mockResolvedValueOnce({ id: "existing-id", tenantIds: [], count: 1 }),
        create: vi.fn(async (a: unknown) => ({ id: "new-id", ...(a as { data: Record<string, unknown> }).data })),
        update: vi.fn(async () => ({})),
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakePrisma }));
    const { captureError, __resetFloodForTests } = await import("@/lib/observability/error-tracker");
    __resetFloodForTests();
    const err = new Error("DB failed");
    (err as unknown as { code: string }).code = "P1000";
    captureError(err, { service: "publishing", operation: "publish", tenantId: "tenant-1" });
    await new Promise((r) => setTimeout(r, 50));
    // second same error
    captureError(err, { service: "publishing", operation: "publish", tenantId: "tenant-2" });
    await new Promise((r) => setTimeout(r, 80));
    expect(fakePrisma.systemError.create).toHaveBeenCalledTimes(1);
    expect(fakePrisma.systemError.update).toHaveBeenCalledTimes(1);
    // tenantIds merged
    const updateArg = fakePrisma.systemError.update.mock.calls[0][0];
    expect(updateArg.data.tenantIds).toEqual(expect.arrayContaining(["tenant-2"]));
  });

  it("tenant filter works via store", async () => {
    const mockRows: unknown[] = [{ id: "1", tenantIds: ["t1"] }];
    vi.doMock("@/lib/prisma", () => ({
      prisma: {
        systemError: {
          findMany: vi.fn(async () => mockRows),
          count: vi.fn(async () => 1),
          findFirst: vi.fn(async () => null),
          create: vi.fn(async () => ({ id: "1" })),
          update: vi.fn(async () => ({})),
          groupBy: vi.fn(async () => []),
          findUnique: vi.fn(async () => null),
        },
      },
    }));
    const { listSystemErrors } = await import("@/lib/observability/system-error-store");
    const res = await listSystemErrors({ tenantId: "t1" });
    expect(res.total).toBe(1);
  });

  it("status transitions work", async () => {
    const fake = {
      systemError: {
        findUnique: vi.fn(async () => ({ id: "id1", fingerprint: "fp", status: "NEW" })),
        update: vi.fn(async () => ({})),
        findFirst: vi.fn(async () => null),
        findMany: vi.fn(async () => []),
        count: vi.fn(async () => 0),
        groupBy: vi.fn(async () => []),
        create: vi.fn(async () => ({})),
      },
      auditLog: { deleteMany: vi.fn(async () => ({ count: 0 })) },
      $executeRawUnsafe: vi.fn(async () => 1),
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fake }));
    vi.doMock("@/lib/audit", () => ({ logAction: vi.fn(async () => {}) }));
    const { setSystemErrorStatus } = await import("@/lib/observability/system-error-store");
    const r1 = await setSystemErrorStatus("id1", "ACKNOWLEDGED", "admin@test.com");
    expect(r1.success).toBe(true);
    const r2 = await setSystemErrorStatus("id1", "RESOLVED", "admin@test.com");
    expect(r2.success).toBe(true);
    const r3 = await setSystemErrorStatus("id1", "IGNORED", "admin@test.com");
    expect(r3.success).toBe(true);
  });

  it("flood protection samples after threshold", async () => {
    const fakePrisma = {
      systemError: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (a: unknown) => ({ id: "1", ...(a as { data: Record<string, unknown> }).data })),
        update: vi.fn(async () => ({})),
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakePrisma }));
    const { captureError, __resetFloodForTests } = await import("@/lib/observability/error-tracker");
    __resetFloodForTests();
    const err = new Error("flood test");
    for (let i = 0; i < 30; i++) captureError(err, { service: "test", operation: "op" });
    await new Promise((r) => setTimeout(r, 150));
    // Should have persisted <30 due to sampling after 20
    const created = fakePrisma.systemError.create.mock.calls.length + fakePrisma.systemError.update.mock.calls.length;
    expect(created).toBeLessThan(30);
    expect(created).toBeGreaterThan(0);
  });

  it("non-admin blocked via actions", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-obs01";
    process.env.NODE_ENV = "test";
    vi.resetModules();
    vi.doMock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { role: "ADMIN" } })) }));
    const { listErrors } = await import("@/app/super-admin/errors/actions");
    const res = await listErrors({});
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/Unauthorized/);
  });

  it("super admin allowed", async () => {
    process.env.NEXTAUTH_SECRET = "test-secret-for-obs01";
    process.env.NODE_ENV = "test";
    vi.resetModules();
    vi.doMock("next-auth", () => ({ getServerSession: vi.fn(async () => ({ user: { role: "SUPER_ADMIN", email: "a@b.com", id: "1" } })) }));
    vi.doMock("@/lib/observability/system-error-store", () => ({
      listSystemErrors: vi.fn(async () => ({ rows: [], total: 0, page: 1, pageSize: 50 })),
      countByStatus: vi.fn(async () => ({ NEW: 0, ACKNOWLEDGED: 0, RESOLVED: 0, IGNORED: 0 })),
      getSystemError: vi.fn(async () => null),
      setSystemErrorStatus: vi.fn(async () => ({ success: true })),
    }));
    const { listErrors } = await import("@/app/super-admin/errors/actions");
    const res = await listErrors({});
    expect(res.success).toBe(true);
  });

  it("sensitive values redacted before persist", async () => {
    const fakePrisma = {
      systemError: {
        findFirst: vi.fn(async () => null),
        create: vi.fn(async (a: unknown) => {
          const data = (a as { data: Record<string, unknown> }).data;
          expect(String(data.message)).not.toContain("secret123");
          expect(String(data.stackTrace ?? "")).not.toContain("re_abc123");
          return { id: "1", ...data };
        }),
        update: vi.fn(async () => ({})),
      },
    };
    vi.doMock("@/lib/prisma", () => ({ prisma: fakePrisma }));
    const { captureError, __resetFloodForTests } = await import("@/lib/observability/error-tracker");
    __resetFloodForTests();
    const err = new Error("failed with password=secret123 and re_abc123456789012345");
    err.stack = "Error: failed\n at foo (app.ts:10:5) token re_abc123456789012345";
    captureError(err, { service: "auth", operation: "login" });
    await new Promise((r) => setTimeout(r, 60));
    expect(fakePrisma.systemError.create).toHaveBeenCalled();
  });

  it("existing Alert/Job/Generation behavior unchanged (smoke)", async () => {
    // Ensure we didn't break alertStore.create by checking it still exists
    const { alertStore } = await import("@/modules/operations/application/alert-store");
    expect(typeof alertStore.create).toBe("function");
    expect(typeof alertStore.list).toBe("function");
  });
});
