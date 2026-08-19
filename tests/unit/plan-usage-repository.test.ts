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
    h.usageFindUnique.mockResolvedValue(null);
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
    h.usageFindUnique.mockResolvedValue(null);
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

  it("RCCF-72.13 — exhausted row (exists at the limit) returns false WITHOUT attempting a create", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(false);
    // The exhausted path performs NO writes: no create (which would P2002 and
    // abort the caller's transaction) and no increment.
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("RCCF-72.13 — concurrent final-slot race: the loser resolves the existing row and is denied without a create", async () => {
    // Request A already incremented the final slot; request B's conditional
    // increment matches 0 rows and the row is now at the limit.
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(false);
    expect(h.usageCreate).not.toHaveBeenCalled();
  });

  it("RCCF-72.13 — concurrent first-create race where the row becomes visible retries the increment (no create, no P2002)", async () => {
    // Between request B's increment (0 rows) and its existence check, request A
    // created the row below the limit — B must retry the increment, not create.
    h.usageUpdateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });
    h.usageFindUnique.mockResolvedValue({ used: 1 });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(true);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(2);
  });

  it("RCCF-72.13 — usage is incremented exactly once on success", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });

    const ok = await planUsageRepository.reserveSlot(makeTx() as never, {
      tenantId: "t1",
      featureKey: PUBLISH_FEATURE_KEY,
      periodStart: PERIOD,
      periodEnd: null,
      limit: 3,
    });

    expect(ok).toBe(true);
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageFindUnique).not.toHaveBeenCalled();
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