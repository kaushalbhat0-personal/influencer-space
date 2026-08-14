import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  workspaceFindUnique: vi.fn(),
  subFindUnique: vi.fn(),
  websiteFindUnique: vi.fn(),
  assertCanPublish: vi.fn(),
  snapCreate: vi.fn(),
  usageUpdateMany: vi.fn(),
  transaction: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: h.tenantFindUnique },
    workspace: { findUnique: h.workspaceFindUnique },
    billingSubscription: { findUnique: h.subFindUnique },
    website: { findUnique: h.websiteFindUnique },
    publishSnapshot: { create: h.snapCreate },
    planUsage: { updateMany: h.usageUpdateMany },
    $transaction: h.transaction,
  },
}));

vi.mock("@/lib/workspace/policy", () => ({ workspacePolicy: { assertCanPublish: h.assertCanPublish } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));

import { isTrialExpiredForTenant } from "@/lib/publishing/publish-usage";
import { publishingService } from "@/lib/publishing/service";

const FUTURE = new Date(Date.now() + 24 * 60 * 60 * 1000);
const PAST = new Date(Date.now() - 24 * 60 * 60 * 1000);

beforeEach(() => {
  vi.clearAllMocks();
  h.tenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "t1", customDomain: null, createdAt: new Date() });
  h.workspaceFindUnique.mockResolvedValue({ id: "w1" });
  h.subFindUnique.mockResolvedValue(null);
  h.websiteFindUnique.mockResolvedValue({ id: "w1" });
  h.assertCanPublish.mockResolvedValue(undefined);
  h.snapCreate.mockResolvedValue({});
  h.usageUpdateMany.mockResolvedValue({ count: 1 });
  h.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb({}));
});

describe("isTrialExpiredForTenant — RCCF-34 canonical trial-expiry boundary", () => {
  it("returns true when TRIALING with a passed trialEndsAt", async () => {
    h.subFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: PAST });
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(true);
  });

  it("returns false during an active trial (future trialEndsAt)", async () => {
    h.subFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: FUTURE });
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(false);
  });

  it("returns false for an ACTIVE subscription regardless of trialEndsAt", async () => {
    h.subFindUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: PAST });
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(false);
  });

  it("returns false when TRIALING without a trialEndsAt (indefinite trial)", async () => {
    h.subFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: null });
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(false);
  });

  it("returns false when the workspace is missing", async () => {
    h.workspaceFindUnique.mockResolvedValue(null);
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(false);
  });

  it("returns false when there is no subscription", async () => {
    await expect(isTrialExpiredForTenant("t1")).resolves.toBe(false);
  });
});

describe("publishingService.publish — RCCF-34 expired-trial gate", () => {
  it("rejects an expired trial publish with PUBLISH_TRIAL_EXPIRED and creates no snapshot or usage", async () => {
    h.subFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: PAST });

    const res = await publishingService.publish("t1");

    expect(res).toMatchObject({
      success: false,
      code: "PUBLISH_TRIAL_EXPIRED",
      suggestedUpgrade: "growth",
    });
    expect(h.snapCreate).not.toHaveBeenCalled();
    expect(h.usageUpdateMany).not.toHaveBeenCalled();
    expect(h.transaction).not.toHaveBeenCalled();
  });

  it("does not fire the gate during an active trial (falls through to the normal publish flow)", async () => {
    h.subFindUnique.mockResolvedValue({ status: "TRIALING", trialEndsAt: FUTURE });

    // The gate must not short-circuit: it proceeds into the publish pipeline.
    const res = await publishingService.publish("t1");

    expect(res.code).not.toBe("PUBLISH_TRIAL_EXPIRED");
    expect(res.success).toBe(false);
    expect(res.error).not.toMatch(/trial/i);
  });

  it("does not fire the gate for an ACTIVE subscription", async () => {
    h.subFindUnique.mockResolvedValue({ status: "ACTIVE", trialEndsAt: null });

    const res = await publishingService.publish("t1");

    expect(res.code).not.toBe("PUBLISH_TRIAL_EXPIRED");
  });
});
