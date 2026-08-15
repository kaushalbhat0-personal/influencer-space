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

import { countStorageUsage, enforceStorageLimit, BYTES_PER_MB, BYTES_PER_GB, storageBytesToGb, storageBytesToMb, resolveStorageLimitBytes, resolveHeroVideoCapability } from "../storage.enforcement";
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

  it("returns the summed ACTIVE asset bytes (RCCF-59 excludes DELETED)", async () => {
    mockAggregate.mockResolvedValue({ _sum: { size: 5 * BYTES_PER_MB } });
    await expect(countStorageUsage("t1")).resolves.toBe(5 * BYTES_PER_MB);
    expect(mockAggregate).toHaveBeenCalledWith({ where: { tenantId: "t1", status: { not: "DELETED" } }, _sum: { size: true } });
  });
});

describe("unit conversions", () => {
  it("converts bytes to GB (legacy) and MB (Creator)", () => {
    expect(storageBytesToGb(BYTES_PER_GB)).toBe(1);
    expect(storageBytesToMb(BYTES_PER_MB)).toBe(1);
    expect(storageBytesToMb(20 * BYTES_PER_MB)).toBe(20);
  });
});

describe("RCCF-59 — canonical Creator storage (MB)", () => {
  it("resolves 20/100/300 MB for Launch/Growth/Scale", () => {
    expect(resolveStorageLimitBytes("creator_launch")).toBe(20 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_grow")).toBe(100 * BYTES_PER_MB);
    expect(resolveStorageLimitBytes("creator_scale")).toBe(300 * BYTES_PER_MB);
  });

  it("Partner plans have NO storage capability (RCCF-60.3)", () => {
    expect(resolveStorageLimitBytes("partner_solo")).toBeNull();
    expect(resolveStorageLimitBytes("partner_scale")).toBeNull();
    expect(resolveStorageLimitBytes("partner_enterprise")).toBeNull();
  });

  it("hero video capability: enabled on Launch/Growth/Scale, 12 MB / 15 s", () => {
    for (const code of ["creator_launch", "creator_grow", "creator_scale"]) {
      const hero = resolveHeroVideoCapability(code);
      expect(hero.enabled).toBe(true);
      expect(hero.maxSizeBytes).toBe(12 * BYTES_PER_MB);
      expect(hero.maxDurationSec).toBe(15);
    }
    // Partner hero not enabled (not part of the approved contract).
    expect(resolveHeroVideoCapability("partner_free").enabled).toBe(false);
  });
});

describe("enforceStorageLimit", () => {
  it("allows an upload within the plan headroom (Creator Scale 300 MB)", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });
    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 10 * BYTES_PER_MB, used: 5 * BYTES_PER_MB });
    expect(decision.ok).toBe(true);
    expect(decision.limit).toBe(300 * BYTES_PER_MB);
    expect(decision.remaining).toBe(295 * BYTES_PER_MB);
    expect(decision.reason).toBeUndefined();
  });

  it("rejects an upload that exceeds the plan limit (Launch 20 MB)", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "active" });
    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 15 * BYTES_PER_MB, used: 15 * BYTES_PER_MB });
    expect(decision.ok).toBe(false);
    expect(decision.limit).toBe(20 * BYTES_PER_MB);
    expect(decision.remaining).toBe(5 * BYTES_PER_MB);
    expect(decision.reason).toContain("Storage quota exceeded");
    expect(decision.reason).toContain("MB");
  });

  it("counts live usage when used is not provided", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "active" });
    mockAggregate.mockResolvedValue({ _sum: { size: 99 * BYTES_PER_MB } });
    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 2 * BYTES_PER_MB });
    expect(mockAggregate).toHaveBeenCalled();
    expect(decision.ok).toBe(false);
    expect(decision.used).toBeCloseTo(99 * BYTES_PER_MB, 0);
  });

  it("falls back to the default plan when the tenant has no subscription", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: null, origin: "none", status: null });
    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 20 * BYTES_PER_MB + 1, used: 0 });
    expect(decision.limit).toBe(20 * BYTES_PER_MB);
    expect(decision.ok).toBe(false);
  });

  it("treats an unlimited plan (-1) as never full", async () => {
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "active" });
    vi.spyOn(capabilityService, "limit").mockReturnValueOnce(-1).mockReturnValueOnce(-1);
    const decision = await enforceStorageLimit({ tenantId: "t1", incomingBytes: 100 * BYTES_PER_MB, used: 500 * BYTES_PER_MB });
    expect(decision.limit).toBe(Infinity);
    expect(decision.ok).toBe(true);
  });
});
