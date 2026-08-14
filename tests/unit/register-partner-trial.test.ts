import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetPlatformConfig: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockBcryptHash: vi.fn(),
  mockTransaction: vi.fn(),
  mockTxUserCreate: vi.fn(),
  mockTxAgencyCreate: vi.fn(),
  mockTxUserUpdate: vi.fn(),
  mockTxAccountCreate: vi.fn(),
  mockTxPlanFindUnique: vi.fn(),
  mockTxSubCreate: vi.fn(),
}));

vi.mock("@/lib/platform/platform-config", () => ({
  getPlatformConfig: h.mockGetPlatformConfig,
  isFlagEnabled: vi.fn(),
}));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: h.mockCheckRateLimit }));
vi.mock("bcryptjs", () => ({ default: { hash: h.mockBcryptHash } }));
vi.mock("@/lib/prisma", () => ({
  prisma: { user: { findUnique: vi.fn().mockResolvedValue(null) }, $transaction: h.mockTransaction },
}));

import { POST } from "@/app/api/auth/register/route";

function req(body: Record<string, unknown>) {
  return new Request("http://localhost/api/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function agencyTx() {
  return {
    user: { create: h.mockTxUserCreate, update: h.mockTxUserUpdate },
    websiteAgency: { create: h.mockTxAgencyCreate },
    billingAccount: { create: h.mockTxAccountCreate },
    billingPlan: { findUnique: h.mockTxPlanFindUnique },
    billingSubscription: { create: h.mockTxSubCreate },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetPlatformConfig.mockResolvedValue({ enableNewRegistrations: true });
  h.mockCheckRateLimit.mockReturnValue({ allowed: true });
  h.mockBcryptHash.mockResolvedValue("hashed");
  h.mockTxUserCreate.mockResolvedValue({ id: "u1" });
  h.mockTxAgencyCreate.mockResolvedValue({ id: "ag1" });
  h.mockTxUserUpdate.mockResolvedValue({});
  h.mockTxAccountCreate.mockResolvedValue({ id: "ba1" });
  h.mockTxPlanFindUnique.mockResolvedValue({ id: "bp1", code: "partner_free", price: 0 });
  h.mockTxSubCreate.mockResolvedValue({ id: "s1" });
  h.mockTransaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(agencyTx()));
});

describe("RCCF-40 — Partner Launch truthful 15-day trial", () => {
  it("creates the Partner Launch subscription as TRIALING with trialEndsAt ~15 days out", async () => {
    const res = await POST(req({ email: "agency@example.com", password: "password123", persona: "agency" }));

    expect(res.status).toBe(201);
    expect(h.mockTxSubCreate).toHaveBeenCalledTimes(1);
    const { data } = h.mockTxSubCreate.mock.calls[0][0] as { data: { status: string; planId: string; trialEndsAt: Date } };
    expect(data.status).toBe("TRIALING");
    expect(data.planId).toBe("bp1");

    const expected = new Date();
    expected.setDate(expected.getDate() + 15);
    const diff = Math.abs(new Date(data.trialEndsAt).getTime() - expected.getTime());
    expect(diff).toBeLessThan(60_000);
  });

  it("does not create a subscription when the Partner Launch plan row is missing", async () => {
    h.mockTxPlanFindUnique.mockResolvedValue(null);
    await POST(req({ email: "agency@example.com", password: "password123", persona: "agency" }));
    expect(h.mockTxSubCreate).not.toHaveBeenCalled();
  });
});
