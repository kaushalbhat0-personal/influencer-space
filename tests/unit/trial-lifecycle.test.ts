import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFindSubscriptionWithPlan } = vi.hoisted(() => ({
  mockFindSubscriptionWithPlan: vi.fn(),
}));

// Heavy billing-service dependencies — stubbed so the singleton imports safely.
vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: { findSubscriptionWithPlan: mockFindSubscriptionWithPlan },
}));
vi.mock("@/modules/billing/infrastructure/providers/razorpay", () => ({ razorpayProvider: {} }));
vi.mock("@/lib/commission", () => ({ commissionService: {} }));
vi.mock("@/lib/partners", () => ({ partnerService: {} }));
vi.mock("@/lib/events", () => ({ platformEventBus: { publish: vi.fn() } }));
vi.mock("@/lib/prisma", () => ({ prisma: {} }));
vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability/metrics-service", () => ({ metricsService: { recordDuration: vi.fn(), recordOutcome: vi.fn() } }));
vi.mock("@/modules/billing/application/storage.enforcement", () => ({
  countStorageUsage: vi.fn().mockResolvedValue(0),
  storageBytesToGb: vi.fn(() => 0),
}));

import { isInTrial, getTrialEndDate } from "@/lib/billing";
import { billingService } from "@/modules/billing/application/service";

function sub(status: string, trialEndsAt: Date | null) {
  return { id: "s1", accountId: "a1", workspaceId: "ws1", plan: { code: "creator_launch" }, status, trialEndsAt };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFindSubscriptionWithPlan.mockReset();
});

describe("isInTrial — RCCF-33 trial boundary", () => {
  it("returns true while the trial is active (trialEndsAt in the future)", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    expect(isInTrial(sub("TRIALING", future) as never)).toBe(true);
  });

  it("returns false at the exact expiry boundary (trialEndsAt <= now)", () => {
    const boundary = new Date(Date.now() - 1);
    expect(isInTrial(sub("TRIALING", boundary) as never)).toBe(false);
  });

  it("returns false after expiry", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);
    expect(isInTrial(sub("TRIALING", past) as never)).toBe(false);
  });

  it("returns true for a TRIALING subscription without an end date (indefinite trial)", () => {
    expect(isInTrial(sub("TRIALING", null) as never)).toBe(true);
  });

  it("returns false for non-trial statuses", () => {
    expect(isInTrial(sub("ACTIVE", null) as never)).toBe(false);
    expect(isInTrial(sub("EXPIRED", null) as never)).toBe(false);
  });
});

describe("getTrialEndDate — 15-day Launch trial", () => {
  it("adds the requested trial days", () => {
    const start = new Date("2026-08-01T00:00:00.000Z");
    const end = getTrialEndDate(start, 15);
    expect(end.getTime()).toBe(start.getTime() + 15 * 24 * 60 * 60 * 1000);
  });
});

describe("billingService.getSubscriptionStatus — RCCF-33 stale trial fix", () => {
  it("reports a TRIALING subscription as active only while the trial is active", async () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const past = new Date(Date.now() - 1000 * 60 * 60 * 24);

    mockFindSubscriptionWithPlan.mockResolvedValueOnce(sub("TRIALING", future));
    mockFindSubscriptionWithPlan.mockResolvedValueOnce(sub("TRIALING", past));

    const activeTrial = await billingService.getSubscriptionStatus("ws1");
    const expiredTrial = await billingService.getSubscriptionStatus("ws1");

    expect(activeTrial?.active).toBe(true);
    expect(expiredTrial?.active).toBe(false);
  });

  it("reports an ACTIVE subscription as active and an EXPIRED one as not", async () => {
    mockFindSubscriptionWithPlan.mockResolvedValueOnce(sub("ACTIVE", null));
    mockFindSubscriptionWithPlan.mockResolvedValueOnce(sub("EXPIRED", null));

    expect((await billingService.getSubscriptionStatus("ws1"))?.active).toBe(true);
    expect((await billingService.getSubscriptionStatus("ws1"))?.active).toBe(false);
  });

  it("returns null when no subscription exists", async () => {
    mockFindSubscriptionWithPlan.mockResolvedValue(null);
    expect(await billingService.getSubscriptionStatus("ws1")).toBeNull();
  });
});