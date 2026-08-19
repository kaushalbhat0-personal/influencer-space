import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";

// RCCF-72.13 — publish quota exhaustion must surface a structured, actionable
// quota failure and NEVER a raw Prisma/Postgres/transaction error. The
// exhausted path performs no writes (no create → no P2002 → no aborted
// transaction) and no snapshot/usage mutation.

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
import { getPublishFailurePresentation } from "@/lib/publishing/publish-error-messages";
import { planUsageRepository } from "@/modules/billing/infrastructure/plan-usage-repository";
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

const reserve = (over: Partial<Parameters<typeof planUsageRepository.reserveSlot>[1]> = {}) =>
  planUsageRepository.reserveSlot(fakeTx() as never, {
    tenantId: "t1",
    featureKey: "publish",
    periodStart: CREATED,
    periodEnd: null,
    limit: 3,
    ...over,
  });

describe("RCCF-72.13 — repository exhausted path is write-free", () => {
  it("1. Launch below quota reserves the slot (no create needed)", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });
    expect(await reserve()).toBe(true);
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageFindUnique).not.toHaveBeenCalled();
  });

  it("2. Launch at quota is denied deterministically", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });
    expect(await reserve()).toBe(false);
  });

  it("3.4. Exhausted quota creates no row and never increments again", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });
    expect(await reserve()).toBe(false);
    // No create attempt → no P2002 → no aborted transaction.
    expect(h.usageCreate).not.toHaveBeenCalled();
    // Exactly one conditional increment ran; it matched 0 rows and stopped.
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("5.6. Growth (monthly) below quota succeeds", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });
    const ok = await reserve({ limit: 10, periodEnd: new Date("2026-08-31T23:59:59.999Z") });
    expect(ok).toBe(true);
    expect(h.usageUpdateMany).toHaveBeenCalledWith({
      where: { tenantId: "t1", featureKey: "publish", periodStart: CREATED, used: { lt: 10 } },
      data: { used: { increment: 1 } },
    });
  });

  it("7.8. Growth exhausted quota is denied with no writes", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 10 });
    const ok = await reserve({ limit: 10 });
    expect(ok).toBe(false);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
  });

  it("15. Concurrent final-slot boundary: loser resolves the existing row and is denied without a create", async () => {
    // Winner already consumed the final slot; loser's conditional increment
    // matches 0 rows, and the row is now at the limit.
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });
    expect(await reserve()).toBe(false);
    expect(h.usageCreate).not.toHaveBeenCalled();
  });
});

describe("RCCF-72.13 — commitPublishWithMetering tier behavior", () => {
  it("9. Scale remains unlimited: snapshot created, no usage interaction", async () => {
    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "unlimited", limit: null },
      tenantCreatedAt: CREATED,
    });
    expect(res).toEqual({ ok: true, version: 1 });
    expect(h.snapCreate).toHaveBeenCalledTimes(1);
    expect(h.usageUpdateMany).not.toHaveBeenCalled();
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.usageFindUnique).not.toHaveBeenCalled();
  });

  it("16. Successful publish lifecycle intact: snapshot created with live state, no usage increment on unlimited", async () => {
    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "unlimited", limit: null },
      tenantCreatedAt: CREATED,
    });
    expect(res).toEqual({ ok: true, version: 1 });
    const call = h.snapCreate.mock.calls[0]?.[0] as { data?: { state?: string } };
    expect(call?.data?.state).toBe("live");
    expect(h.statusUpsert).toHaveBeenCalled();
  });

  it("11. Exhausted quota returns the structured quota failure (not a thrown DB error)", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });
    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });
    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.used).toBe(3);
      expect(res.limit).toBe(3);
      expect(res.mode).toBe("lifetime");
      expect(res.periodStart).toBe(CREATED.toISOString());
      expect(res.periodEnd).toBeNull();
    }
    expect(h.snapCreate).not.toHaveBeenCalled();
  });

  it("14. A failed (exhausted) publish never increments usage", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 0 });
    h.usageFindUnique.mockResolvedValue({ used: 3 });
    await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.usageCreate).not.toHaveBeenCalled();
  });

  it("13. Successful limited publish increments usage exactly once", async () => {
    h.usageUpdateMany.mockResolvedValue({ count: 1 });
    const res = await publishingService.commitPublishWithMetering({
      tenantId: "t1",
      websiteId: "w1",
      canonicalSnapshot: snapshot(),
      policy: { mode: "lifetime", limit: 3 },
      tenantCreatedAt: CREATED,
    });
    expect(res).toEqual({ ok: true, version: 1 });
    expect(h.usageUpdateMany).toHaveBeenCalledTimes(1);
    expect(h.usageCreate).not.toHaveBeenCalled();
    expect(h.snapCreate).toHaveBeenCalledTimes(1);
  });
});

describe("RCCF-72.13 — error contract: raw DB text never reaches the UI", () => {
  const repositorySrc = readFileSync("src/modules/billing/infrastructure/plan-usage-repository.ts", "utf8");
  const messagesSrc = readFileSync("src/lib/publishing/publish-error-messages.ts", "utf8");

  it("10. a Postgres transaction-abort message collapses to the safe generic message", () => {
    const p = getPublishFailurePresentation({
      success: false,
      error: "Current transaction is aborted, commands ignored until end of transaction block",
    });
    expect(p.message).toBe("Publishing failed. Please try again.");
    expect(p.message).not.toMatch(/transaction|aborted|commands|database|sql/i);
  });

  it("10b. Prisma/Postgres variant phrasing is also sanitized", () => {
    expect(getPublishFailurePresentation({ success: false, error: "Error: transaction is aborted" }).message).toBe(
      "Publishing failed. Please try again.",
    );
    expect(getPublishFailurePresentation({ success: false, error: "PrismaClientUnknownRequestError: aborting" }).message).toBe(
      "Publishing failed. Please try again.",
    );
  });

  it("12. existing coded quota mapping remains intact (structured result → friendly copy)", () => {
    const p = getPublishFailurePresentation({
      success: false,
      code: "PUBLISH_QUOTA_EXCEEDED",
      used: 3,
      limit: 3,
      mode: "lifetime",
      suggestedUpgrade: "growth",
    });
    expect(p.severity).toBe("warning");
    expect(p.message).toContain("You've used all 3 publishes available on your current plan.");
    expect(p.message).toContain("Upgrade to keep publishing.");
    expect(p.action?.href).toBe("/admin/billing");
  });

  it("guardrail: reserveSlot resolves the row BEFORE any create; the exhausted path never creates", () => {
    expect(repositorySrc).toContain("findUnique");
    expect(repositorySrc).toContain("existing.used < limit");
    expect(repositorySrc).toContain("return false; // exhausted");
    // The exhausted branch and the create attempt are structurally separated.
    expect(repositorySrc.indexOf("findUnique")).toBeLessThan(repositorySrc.indexOf("planUsage.create"));
  });

  it("guardrail: transaction-abort text is classified as technical in the presentation layer", () => {
    expect(messagesSrc).toContain("transaction is aborted");
    expect(messagesSrc).toContain("commands ignored");
  });

  it("guardrail: no plan limits are hardcoded in the repository or presentation layer", () => {
    for (const src of [repositorySrc, messagesSrc]) {
      expect(src).not.toContain("creator_launch");
      expect(src).not.toContain("creator_grow");
      expect(src).not.toContain("creator_scale");
    }
    expect(repositorySrc).not.toContain("limit: 3");
    expect(repositorySrc).not.toContain("limit: 10");
  });
});