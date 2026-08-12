import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  findUnique: vi.fn(),
  findFirst: vi.fn(),
  update: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    billingAccount: { findUnique: h.findUnique },
    billingSubscription: { findFirst: h.findFirst, update: h.update },
  },
}));

import { BillingRepository } from "@/modules/billing/infrastructure/repository";

const repo = new BillingRepository();

beforeEach(() => {
  vi.clearAllMocks();
});

describe("BillingRepository.linkSubscriptionToWorkspace — RCCF-07", () => {
  it("backfills workspaceId onto the registration-created subscription", async () => {
    h.findUnique.mockResolvedValue({ id: "acc-1" });
    h.findFirst.mockResolvedValue({ id: "sub-1", accountId: "acc-1", workspaceId: null });
    h.update.mockResolvedValue({ id: "sub-1", accountId: "acc-1", workspaceId: "ws-1" });

    const result = await repo.linkSubscriptionToWorkspace({
      workspaceId: "ws-1",
      accountType: "creator",
      accountId: "user-1",
    });

    expect(h.findUnique).toHaveBeenCalledWith({
      where: { accountType_accountId: { accountType: "creator", accountId: "user-1" } },
      select: { id: true },
    });
    expect(h.findFirst).toHaveBeenCalledWith({
      where: { accountId: "acc-1", workspaceId: null },
      orderBy: { createdAt: "asc" },
    });
    expect(h.update).toHaveBeenCalledWith({
      where: { id: "sub-1" },
      data: { workspaceId: "ws-1" },
    });
    expect(result?.workspaceId).toBe("ws-1");
  });

  it("returns null when the creator billing account does not exist", async () => {
    h.findUnique.mockResolvedValue(null);
    const result = await repo.linkSubscriptionToWorkspace({
      workspaceId: "ws-1",
      accountType: "creator",
      accountId: "user-1",
    });
    expect(result).toBeNull();
    expect(h.findFirst).not.toHaveBeenCalled();
  });

  it("returns null when the account already has a workspace-linked subscription", async () => {
    h.findUnique.mockResolvedValue({ id: "acc-1" });
    h.findFirst.mockResolvedValue(null);
    const result = await repo.linkSubscriptionToWorkspace({
      workspaceId: "ws-1",
      accountType: "creator",
      accountId: "user-1",
    });
    expect(result).toBeNull();
    expect(h.update).not.toHaveBeenCalled();
  });
});
