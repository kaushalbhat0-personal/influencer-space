import { describe, it, expect, vi, beforeEach } from "vitest";
import { planUsageRepository, PUBLISH_FEATURE_KEY } from "@/modules/billing/infrastructure/plan-usage-repository";

const h = vi.hoisted(() => ({
  usageUpdateMany: vi.fn(),
  usageCreate: vi.fn(),
  usageFindUnique: vi.fn(),
}));

function makeTx() {
  return {
    planUsage: {
      updateMany: h.usageUpdateMany,
      create: h.usageCreate,
      findUnique: h.usageFindUnique,
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  h.usageUpdateMany.mockReset();
  h.usageCreate.mockReset();
  h.usageFindUnique.mockReset();
});

const PERIOD = new Date("2026-08-01T00:00:00.000Z");

describe("planUsageRepository.reserveSlot — RCCF-31 atomicity", () => {
  it("reserves via conditional increment when the row exists below the limit", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(true);
    expect(h.usageUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: "t1", featureKey: PUBLISH_FEATURE_KEY, periodStart: PERIOD, used: { lt: 3 } },
      data: { used: { increment: 1 } },
    });
    expect(h.usageCreate).not.toHaveBeenCalled();
  });

  it("creates the first usage row atomically when the row is missing", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageCreate.mockResolvedValue({ id: "u1" });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(true);
    expect(h.usageCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ used: 1 }) }),
    );
  });

  it("retries the conditional increment after a concurrent first-create race", async () => {
    h.usageUpdateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    h.usageCreate.mockRejectedValue({ code: "P2002" });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(true);
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("returns false when the limit is exhausted (row exists at the limit)", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageCreate.mockRejectedValue({ code: "P2002" });
    h.usageUpdateMany.mockResolvedValueOnce({ count: 0 }); // initial
    h.usageUpdateMany.mockResolvedValueOnce({ count: 0 }); // retry

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(false);
  });

  it("returns false for a limit of 0 (disabled)", async () => {
    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 0,
    });

    expect(ok).toBe(false);
    expect(h.usageUpdateMany).not.toHaveBeenCalled();
  });
});