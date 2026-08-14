import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetPlatformConfig: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxUserCreate: vi.fn(),
  mockTxPlanFindUnique: vi.fn(),
  mockTxAccountCreate: vi.fn(),
  mockTxSubCreate: vi.fn(),
  mockTxSubCreateAgency: vi.fn(),
  mockTxAgencyCreate: vi.fn(),
  mockTxUserUpdate: vi.fn(),
}));

vi.mock("@/lib/platform/platform-config", () => ({
  getPlatformConfig: h.mockGetPlatformConfig,
  isFlagEnabled: vi.fn(),
}));

vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: h.mockCheckRateLimit }));

vi.mock("bcryptjs", () => ({ default: { hash: h.mockBcryptHash } }));

vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: h.mockUserFindUnique }, $transaction: h.mockTransaction },
}));

import { POST } from "@/app/api/auth/register/route";

function req(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function creatorTx() {
  return {
    user: { create: h.mockTxUserCreate },
    billingPlan: { findUnique: h.mockTxPlanFindUnique },
    billingAccount: { create: h.mockTxAccountCreate },
    billingSubscription: { create: h.mockTxSubCreate },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetPlatformConfig.mockResolvedValue({ enableNewRegistrations: true });
  h.mockCheckRateLimit.mockReturnValue({ allowed: true });
  h.mockBcryptHash.mockResolvedValue("hashed");
  h.mockUserFindUnique.mockResolvedValue(null);
  h.mockTxUserCreate.mockResolvedValue({ id: "u1" });
  h.mockTxPlanFindUnique.mockResolvedValue({ id: "bp1", code: "creator_launch", price: 0 });
  h.mockTxAccountCreate.mockResolvedValue({ id: "ba1" });
  h.mockTxSubCreate.mockResolvedValue({ id: "s1" });
  h.mockTxSubCreateAgency.mockResolvedValue({ id: "s2" });
  h.mockTxAgencyCreate.mockResolvedValue({ id: "ag1" });
  h.mockTxUserUpdate.mockResolvedValue({});
  h.mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(creatorTx()));
});

describe("register route — RCCF-32 truthful 15-day Launch trial", () => {
  it("creates the free Creator Launch subscription as TRIALING with trialEndsAt ~15 days out", async () => {
    await POST(req({ email: "creator@example.com", password: "password123", persona: "creator" }));

    expect(h.mockTxSubCreate).toHaveBeenCalledTimes(1);
    const { data } = h.mockTxSubCreate.mock.calls[0][0] as { data: { status: string; planId: string; trialEndsAt: Date } };
    expect(data.status).toBe("TRIALING");
    expect(data.planId).toBe("bp1");

    const expected = new Date();
    expected.setDate(expected.getDate() + 15);
    const diff = Math.abs(new Date(data.trialEndsAt).getTime() - expected.getTime());
    expect(diff).toBeLessThan(60_000);
  });

  it("does not create a subscription when the Launch plan row is missing", async () => {
    h.mockTxPlanFindUnique.mockResolvedValue(null);

    await POST(req({ email: "creator@example.com", password: "password123", persona: "creator" }));

    expect(h.mockTxSubCreate).not.toHaveBeenCalled();
  });
});