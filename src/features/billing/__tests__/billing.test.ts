import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWorkspaceFindUnique, mockGetBillingInfo, mockGetPlans } = vi.hoisted(() => ({
  mockWorkspaceFindUnique: vi.fn(),
  mockGetBillingInfo: vi.fn(),
  mockGetPlans: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    workspace: {
      findUnique: mockWorkspaceFindUnique,
    },
  },
}));

vi.mock("@/lib/billing/service", () => ({
  billingService: {
    getBillingInfo: mockGetBillingInfo,
    getPlans: mockGetPlans,
  },
}));

import { billingFeatureService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Billing feature service", () => {
  it("getData returns billing data", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", tenantId: "t1" });
    mockGetBillingInfo.mockResolvedValue({
      plan: { code: "creator_free", name: "Free", price: 0 },
      subscription: { id: "sub-1", status: "ACTIVE" },
      invoices: [],
      activeProducts: 3,
      storageUsed: 0,
    });
    mockGetPlans.mockReturnValue([{ code: "creator_free", name: "Free Forever", description: "", price: 0, currency: "INR", features: {}, recommended: false }]);

    const result = await billingFeatureService.getData("t1");
    expect(result.plan.code).toBe("creator_free");
    expect(result.subscription.status).toBe("ACTIVE");
    expect(result.usage).toHaveLength(2);
  });

  it("getData throws when workspace not found", async () => {
    mockWorkspaceFindUnique.mockResolvedValue(null);
    await expect(billingFeatureService.getData("t1")).rejects.toThrow("Workspace not found");
  });

  it("getData returns usage metrics", async () => {
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1", tenantId: "t1" });
    mockGetBillingInfo.mockResolvedValue({
      plan: { code: "creator_pro", name: "Pro", price: 999 },
      subscription: { id: "sub-1", status: "ACTIVE" },
      invoices: [],
      activeProducts: 5,
      storageUsed: 1048576,
    });
    mockGetPlans.mockReturnValue([{ code: "creator_pro", name: "Pro", description: "", price: 999, currency: "INR", features: {}, recommended: true }]);

    const result = await billingFeatureService.getData("t1");
    expect(result.usage.find((u) => u.metric === "Products")?.used).toBe(5);
    expect(result.usage.find((u) => u.metric === "Storage")?.used).toBe(1);
  });
});
