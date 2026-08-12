import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockResolveActivePlan, mockAggregate } = vi.hoisted(() => ({
  mockResolveActivePlan: vi.fn(),
  mockAggregate: vi.fn(),
}));

vi.mock("../plan-source", () => ({
  resolveActivePlan: mockResolveActivePlan,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: { asset: { aggregate: mockAggregate } },
}));

import { countStorageUsage, enforceStorageLimit, BYTES_PER_GB, storageBytesToGb } from "../storage.enforcement";
import { capabilityService } from "@/lib/capabilities";

beforeEach(() => {
  vi.clearAllMocks();
  mockResolveActivePlan.mockReset();
  mockAggregate.mockReset();
});

describe("countStorageUsage", () => {
  it("returns 0 when no assets are stored", async () => {
    mockAggregate.mockResolvedValue({ _sum: { size: null } });
    await expect(countStorageUsage("t1")).resolves.toBe(0);
  });

  it("returns the summed asset bytes", async () => {
    mockAggregate.mockResolvedValue({ _sum: { size: 5 * BYTES_PER_GB } });
    await expect(countStorageUsage("t1")).resolves.toBe(5 * BYTES_PER_GB);
    expect(mockAggregate).toHaveBeenCalledWith({ where: { tenantId: "t1" }, _sum: { size: true } });
  });
});

describe("storageBytesToGb", () => {
  it("converts bytes to GB with one decimal", () => {
    expect(storageBytesToGb(0)).toBe(0);
    expect(storageBytesToGb(BYTES_PER_GB)).toBe(1);
    expect(storageBytesToGb(2.5 * BYTES_PER_GB)).toBe(2.5);
    expect(storageBytesToGb(0.34 * BYTES_PER_GB)).toBe(0.3);
  });
});

describe("enforceStorageLimit", () => {
  it("allows an upload within the plan headroom", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 10 * BYTES_PER_GB, used: 5 * BYTES_PER_GB });

    expect(decision.ok).toBe(true);
    expect(decision.limitGb).toBe(50);
    expect(decision.remaining).toBe(45 * BYTES_PER_GB);
    expect(decision.reason).toBeUndefined();
  });

  it("rejects an upload that exceeds the plan limit", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "active" });

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: BYTES_PER_GB, used: BYTES_PER_GB });

    expect(decision.ok).toBe(false);
    expect(decision.limitGb).toBe(1);
    expect(decision.remaining).toBe(0);
    expect(decision.reason).toContain("Storage limit reached");
  });

  it("counts live usage when used is not provided", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "active" });
    mockAggregate.mockResolvedValue({ _sum: { size: 9.9 * BYTES_PER_GB } });

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 0.2 * BYTES_PER_GB });

    expect(mockAggregate).toHaveBeenCalled();
    expect(decision.ok).toBe(false);
    expect(decision.used).toBeCloseTo(9.9 * BYTES_PER_GB, 0);
  });

  it("falls back to the default plan when the tenant has no subscription", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: null });

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: BYTES_PER_GB + 1, used: 0 });

    expect(decision.limitGb).toBe(1);
    expect(decision.ok).toBe(false);
  });

  it("treats an unlimited plan (-1) as never full", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });
    vi.spyOn(capabilityService, "limit").mockReturnValueOnce(-1);

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 100 * BYTES_PER_GB, used: 500 * BYTES_PER_GB });

    expect(decision.limit).toBe(Infinity);
    expect(decision.ok).toBe(true);
  });

  it("reports disabled plans (0) as unavailable", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });
    vi.spyOn(capabilityService, "limit").mockReturnValueOnce(0);

    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 1, used: 0 });

    expect(decision.ok).toBe(false);
    expect(decision.reason).toBe("Storage is not available on your current plan.");
  });
});