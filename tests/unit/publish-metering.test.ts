import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  transaction: vi.fn(),
  snapAggregate: vi.fn(),
  snapCreate: vi.fn(),
  statusUpsert: vi.fn(),
  statusUpdate: vi.fn(),
  usageUpdateMany: vi.fn(),
  usageCreate: vi.fn(),
  usageFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: h.transaction,
    publishSnapshot: { aggregate: h.snapAggregate, create: h.snapCreate },
    publishStatus: { upsert: h.statusUpsert, update: h.statusUpdate },
    planUsage: { updateMany: h.usageUpdateMany, create: h.usageCreate, findUnique: h.usageFindUnique },
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), trace: vi.fn() } }));

import { publishingService } from "@/lib/publishing/service";
import type { PublishedSnapshot } from "@/types/snapshot";

function snapshot(): PublishedSnapshot {
  return {
    _schema: "snapshot",
    _version: 1,
    metadata: { version: 0, publishedAt: null, correlationId: "c", generatedBy: "dashboard" },
    content: { identity: { name: "N", avatar: "", tagline: "", bio: "" } },
    layout: { pages: [] },
    theme: { packageId: "x", colors: {}, typography: { heading: "Inter", body: "Inter" } },
    navigation: [],
    renderingHints: {},
  } as unknown as PublishedSnapshot;
}

function fakeTx() {
  return {
    planUsage: { updateMany: h.usageUpdateMany, create: h.usageCreate, findUnique: h.usageFindUnique },
    publishSnapshot: { aggregate: h.snapAggregate, create: h.snapCreate },
    publishStatus: { upsert: h.statusUpsert, update: h.statusUpdate },
  };
}

const CREATED = new Date("2026-01-10T08:30:00.000Z");

beforeEach(() => {
  vi.clearAllMocks();
  h.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => cb(fakeTx()));
  h.snapAggregate.mockReset();
  h.snapAggregate.mockResolvedValue({ _max: { version: 0 } });
  h.snapCreate.mockReset();
  h.snapCreate.mockResolvedValue({ version: 1, websiteId: "w1" });
  h.statusUpsert.mockResolvedValue({});
  h.statusUpdate.mockResolvedValue({});
  h.usageUpdateMany.mockReset();
  h.usageCreate.mockReset();
  h.usageFindUnique.mockReset();
});

describe("commitPublishWithMetering — RCCF-31", () => {
  it("unlimited plans create the snapshot with no usage row", async () => {
    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "unlimited", limit: null },
      tenantCreatedAt: CREATED,
    });

    expect(res).toEqual({ ok: true, version: 1 });
    expect(h.usageUpdateMany).not.toHaveBeenCalled();
    expect(h.snapCreate).toHaveBeenCalled();
  });

  it("lifetime plan reserves one slot and creates the snapshot in the same transaction", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });

    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });

    expect(res).toEqual({ ok: true, version: 1 });
    expect(h.usageUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: "t1", featureKey: "publish", periodStart: CREATED, used: { lt: 3 } },
      data: { used: { increment: 1 } },
    });
    expect(h.snapCreate).toHaveBeenCalled();
  });

  it("monthly plan uses the calendar-month window", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });

    await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "monthly", limit: 10 },
      tenantCreatedAt: CREATED,
    });

    expect(h.usageUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ periodStart: new Date("2026-08-01T00:00:00.000Z"), used: { lt: 10 } }),
      }),
    );
  });

  it("RCCF-72.13 — exhausted lifetime quota rejects without creating a snapshot or touching usage writes", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageCreate.mockRejectedValue({ code: "P2002" });
    h.usageFindUnique.mockResolvedValue({ id: "u1", used: 3 });

    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });

    expect(res).toEqual({
      ok: false,
      used: 3,
      limit: 3,
      periodStart: CREATED.toISOString(),
      periodEnd: null,
      mode: "lifetime",
      suggestedUpgrade: null,
    });
    expect(h.snapCreate).not.toHaveBeenCalled();
    expect(h.statusUpdate).not.toHaveBeenCalled();
    // The exhausted path never attempts a create — a create on the existing row
    // would P2002 and abort the caller's transaction (raw DB error in the UI).
    expect(h.usageCreate).not.toHaveBeenCalled();
    // The conditional increment ran once (matched 0 rows) and stopped.
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("RCCF-72.13 — exhausted monthly quota rejects without creating a snapshot or incrementing usage", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageCreate.mockRejectedValue({ code: "P2002" });
    h.usageFindUnique.mockResolvedValue({ id: "u1", used: 10 });

    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "monthly", limit: 10 },
      tenantCreatedAt: CREATED,
    });

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.used).toBe(10);
      expect(res.limit).toBe(10);
      expect(res.mode).toBe("monthly");
      expect(res.periodEnd).not.toBeNull();
    }
    expect(h.snapCreate).not.toHaveBeenCalled();
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("RCCF-72.13 — concurrent final-slot publishes: exactly one reserves, the loser is denied without a create", async () => {
    // Request A wins the final slot via the conditional increment.
    h.usageUpdateMany
      .mockResolvedValueOnce({ count: 1 }) // A: used 2 → 3 (at limit)
      .mockResolvedValueOnce({ count: 0 }); // B: used < 3 matches nothing
    h.usageCreate.mockRejectedValue({ code: "P2002" });
    h.usageFindUnique.mockResolvedValue({ id: "u1", used: 3 });

    const resA = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });
    expect(resA).toEqual({ ok: true, version: 1 });

    const resB = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });
    expect(resB).toEqual({
      ok: false,
      used: 3,
      limit: 3,
      periodStart: CREATED.toISOString(),
      periodEnd: null,
      mode: "lifetime",
      suggestedUpgrade: null,
    });
    // Loser never attempted a create (no P2002, no transaction abort).
    expect(h.usageCreate).not.toHaveBeenCalled();
  });

  it("RCCF-72.13 — successful publish increments usage exactly once", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });

    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "monthly", limit: 10 },
      tenantCreatedAt: CREATED,
    });

    expect(res).toEqual({ ok: true, version: 1 });
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.snapCreate).toHaveBeenCalledTimes(1);
  });

  it("a failed snapshot rolls the quota back (transaction aborts)", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });
    h.snapCreate.mockRejectedValue(new Error("snapshot failed"));

    await expect(
      publishingService.commitPublishWithMetering({
        tenantId: "t1",
        websiteId: "w1",
        canonicalSnapshot: snapshot(),
        policy: { mode: "lifetime", limit: 3 },
        tenantCreatedAt: CREATED,
      }),
    ).rejects.toThrow("snapshot failed");
  });
});