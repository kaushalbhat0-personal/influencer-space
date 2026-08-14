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

  it("exhausted lifetime quota rejects without creating a snapshot", async () => {
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