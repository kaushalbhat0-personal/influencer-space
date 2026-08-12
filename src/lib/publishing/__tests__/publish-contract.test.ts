import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  tenantFindUnique: vi.fn(),
  websiteFindUnique: vi.fn(),
  statusFindUnique: vi.fn(),
  statusUpdate: vi.fn(),
  statusUpsert: vi.fn(),
  transaction: vi.fn(),
  snapAggregate: vi.fn(),
  snapCreate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: h.tenantFindUnique },
    website: { findUnique: h.websiteFindUnique },
    publishStatus: { findUnique: h.statusFindUnique, update: h.statusUpdate, upsert: h.statusUpsert },
    publishSnapshot: { aggregate: h.snapAggregate, create: h.snapCreate },
    $transaction: h.transaction,
  },
}));

vi.mock("next/cache", () => ({ revalidatePath: h.revalidatePath }));
vi.mock("@/lib/observability/logger", () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

import { afterContentChange } from "../content-change";
import { publishingService } from "../service";
import { publishRepository } from "@/modules/tenant/infrastructure/publishing-repository";
import type { PublishedSnapshot } from "@/types/snapshot";

function minimalSnapshot(): PublishedSnapshot {
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

beforeEach(() => {
  vi.clearAllMocks();
  h.tenantFindUnique.mockResolvedValue({ id: "t1", subdomain: "abc", customDomain: null });
  h.websiteFindUnique.mockResolvedValue({ id: "w1" });
  h.statusFindUnique.mockResolvedValue({ state: "live" });
  h.statusUpdate.mockResolvedValue({});
  h.statusUpsert.mockResolvedValue({});
  h.snapAggregate.mockResolvedValue({ _max: { version: 5 } });
  h.snapCreate.mockResolvedValue({ version: 6, websiteId: "w1" });
  h.transaction.mockImplementation(async (cb: (tx: unknown) => unknown) => {
    return cb({
      publishSnapshot: { aggregate: h.snapAggregate, create: h.snapCreate },
      publishStatus: { upsert: h.statusUpsert, update: h.statusUpdate },
    });
  });
});

describe("RCCF-15 Case 1 — CMS edit marks changes pending", () => {
  it("flips publish state live → draft after a content change", async () => {
    await afterContentChange("t1");

    expect(h.statusUpdate).toHaveBeenCalledWith({
      where: { websiteId: "w1" },
      data: { state: "draft" },
    });
  });

  it("keeps state pending when it is already draft (multiple edits → still pending)", async () => {
    h.statusFindUnique.mockResolvedValue({ state: "draft" });

    await afterContentChange("t1");
    await afterContentChange("t1");

    expect(h.statusUpdate).not.toHaveBeenCalled();
  });

  it("tolerates a missing publish status row without erroring", async () => {
    h.statusFindUnique.mockResolvedValue(null);

    await expect(afterContentChange("t1")).resolves.toBeUndefined();
    expect(h.statusUpdate).not.toHaveBeenCalled();
  });

  it("does NOT create a new snapshot on a content edit (snapshot unchanged until publish)", async () => {
    await afterContentChange("t1");

    expect(h.snapCreate).not.toHaveBeenCalled();
  });
});

describe("RCCF-15 Case 2 & 3 — publish clears pending and creates a new snapshot", () => {
  it("publishRepository.createPublish sets state live + bumps version", async () => {
    const result = await publishRepository.createPublish("w1", minimalSnapshot());

    expect(result).toEqual({ version: 6, websiteId: "w1" });
    expect(h.snapCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ websiteId: "w1", version: 6, state: "live" }),
      }),
    );
    expect(h.statusUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { websiteId: "w1" },
        data: expect.objectContaining({ state: "live", liveVersion: 6 }),
      }),
    );
  });
});

describe("RCCF-15 Case 4 — failed publish preserves the previous snapshot and pending state", () => {
  it("publish fails early (no storefront routing) without touching snapshot or status", async () => {
    h.tenantFindUnique.mockResolvedValue({ id: "t1", subdomain: null, customDomain: null });

    const result = await publishingService.publish("t1");

    expect(result.success).toBe(false);
    expect(result.error).toContain("Storefront routing");
    expect(h.snapCreate).not.toHaveBeenCalled();
    expect(h.statusUpdate).not.toHaveBeenCalled();
  });
});