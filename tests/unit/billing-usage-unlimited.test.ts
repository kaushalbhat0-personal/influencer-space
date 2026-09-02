import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks for billingService.getBillingInfo ──────────────────────────────────
const h = vi.hoisted(() => ({
  mockProductCount: vi.fn(),
  mockGalleryCount: vi.fn(),
  mockOrderCount: vi.fn(),
  mockStorageBytes: vi.fn(),
  mockOrderUsage: vi.fn(),
  mockFindSubscriptionWithPlan: vi.fn(),
  mockGetRuntimePlan: vi.fn(),
  mockBillingInvoiceFindMany: vi.fn(),
  mockBillingEventFindMany: vi.fn(),
  mockResolveStorageCapability: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { count: h.mockProductCount },
    galleryImage: { count: h.mockGalleryCount },
    productOrder: { count: h.mockOrderCount },
    billingInvoice: { findMany: h.mockBillingInvoiceFindMany },
    billingEvent: { findMany: h.mockBillingEventFindMany },
  },
}));

vi.mock("@/modules/billing/infrastructure/repository", () => ({
  billingRepository: {
    findSubscriptionWithPlan: h.mockFindSubscriptionWithPlan,
  },
}));

vi.mock("@/modules/billing/application/storage.enforcement", () => ({
  countStorageUsage: h.mockStorageBytes,
  resolveStorageCapability: h.mockResolveStorageCapability,
  BYTES_PER_MB: 1024 * 1024,
}));

vi.mock("@/modules/billing/application/order-completion", () => ({
  getCurrentOrderUsage: h.mockOrderUsage,
}));

vi.mock("@/modules/pricing/application/runtime", () => ({
  getRuntimePlan: h.mockGetRuntimePlan,
}));

import { billingService } from "@/modules/billing/application/service";
import { capabilityService } from "@/lib/capabilities";
import {
  getUsageStatus,
  getUsagePercentage,
  isMetricOverLimit,
  getMetricsOverLimit,
  getMetricsAtWarning,
  formatUsageDisplay,
} from "@/lib/billing/usage-engine";
import type { UsageQuota } from "@/lib/billing/types";

beforeEach(() => {
  vi.clearAllMocks();
  h.mockBillingInvoiceFindMany.mockResolvedValue([]);
  h.mockBillingEventFindMany.mockResolvedValue([]);
  h.mockGetRuntimePlan.mockResolvedValue(null);
  h.mockStorageBytes.mockResolvedValue(1.3 * 1024 * 1024);
  h.mockOrderUsage.mockResolvedValue({ used: 0, limit: 100 });
  h.mockProductCount.mockResolvedValue(2);
  h.mockGalleryCount.mockResolvedValue(0);
  h.mockOrderCount.mockResolvedValue(0);
  h.mockResolveStorageCapability.mockImplementation((planCode: string) => {
    const map: Record<string, number> = {
      creator_launch: 20 * 1024 * 1024,
      creator_grow: 100 * 1024 * 1024,
      creator_scale: 300 * 1024 * 1024,
      creator_enterprise: 500 * 1024 * 1024,
    };
    return { limitBytes: map[planCode] ?? 100 * 1024 * 1024 };
  });
});

function quota(used: number, limit: number, metric = "max_products"): UsageQuota {
  return { metric: metric as UsageQuota["metric"], label: "Products", used, limit, unit: "" };
}

describe("RCCF-BILLING-UX-02B — unlimited sentinel contract", () => {
  it("capability UNLIMITED is -1 and capabilityService understands it", () => {
    expect(capabilityService.limit("creator_grow", "max_products")).toBe(-1);
    expect(capabilityService.limit("creator_grow", "max_gallery")).toBe(-1);
    expect(capabilityService.limit("creator_scale", "max_orders")).toBe(-1);
  });

  it("0 is disabled, not unlimited", () => {
    expect(capabilityService.limit("creator_launch", "max_bookings")).toBe(0);
    // checkLimit disabled should not be isUnlimited
    const c = capabilityService.checkLimit("creator_launch", "max_bookings", 0);
    expect(c.isUnlimited).toBe(false);
    expect(c.limit).toBe(0);
  });
});

// TEST 1 — billing service normalizes products
describe("TEST 1 — BILLING SERVICE NORMALIZES PRODUCTS", () => {
  it("creator_grow max_products -1 → Infinity", async () => {
    h.mockFindSubscriptionWithPlan.mockResolvedValue({
      plan: { code: "creator_grow" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    const info = await billingService.getBillingInfo("ws1", "tenant1");
    const products = info.usage.find((u) => u.metric === "max_products")!;
    expect(products.limit).toBe(Infinity);
    expect(products.limit).not.toBe(-1);
    expect(products.used).toBe(2);
  });
});

// TEST 2 — billing service normalizes gallery
describe("TEST 2 — BILLING SERVICE NORMALIZES GALLERY", () => {
  it("creator_grow max_gallery -1 → Infinity", async () => {
    h.mockFindSubscriptionWithPlan.mockResolvedValue({
      plan: { code: "creator_grow" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    const info = await billingService.getBillingInfo("ws1", "tenant1");
    const gallery = info.usage.find((u) => u.metric === "max_gallery")!;
    expect(gallery.limit).toBe(Infinity);
    expect(gallery.used).toBe(0);
  });
});

// TEST 3 — billing service normalizes orders for Scale
describe("TEST 3 — BILLING SERVICE NORMALIZES ORDERS", () => {
  it("creator_scale max_orders -1 → Infinity", async () => {
    h.mockFindSubscriptionWithPlan.mockResolvedValue({
      plan: { code: "creator_scale" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    h.mockOrderUsage.mockResolvedValue({ used: 5, limit: -1 });
    const info = await billingService.getBillingInfo("ws1", "tenant1");
    const orders = info.usage.find((u) => u.metric === "max_orders")!;
    expect(orders.limit).toBe(Infinity);
  });
});

// TEST 4 — usage status
describe("TEST 4 — USAGE STATUS", () => {
  it("unlimited is never warning/over_limit", () => {
    expect(getUsageStatus(2, -1)).toBe("ok");
    expect(getUsageStatus(2, Infinity)).toBe("ok");
    expect(getUsageStatus(999999, -1)).toBe("ok");
  });
  it("finite still works", () => {
    expect(getUsageStatus(2, 10)).toBe("ok");
    expect(getUsageStatus(8, 10)).toBe("warning");
    expect(getUsageStatus(10, 10)).toBe("over_limit");
  });
});

// TEST 5 — over limit
describe("TEST 5 — OVER LIMIT", () => {
  it("unlimited never over limit", () => {
    expect(isMetricOverLimit(quota(2, -1))).toBe(false);
    expect(isMetricOverLimit(quota(2, Infinity))).toBe(false);
    expect(isMetricOverLimit(quota(999999, -1))).toBe(false);
  });
  it("finite over limit still fires", () => {
    expect(isMetricOverLimit(quota(10, 10))).toBe(true);
    expect(isMetricOverLimit(quota(11, 10))).toBe(true);
  });
});

// TEST 6 — warning
describe("TEST 6 — WARNING", () => {
  it("unlimited never warning", () => {
    const quotas: UsageQuota[] = [quota(999999, -1), { metric: "max_products" as UsageQuota["metric"], label: "Products", used: 999999, limit: -1, unit: "" }];
    expect(getMetricsAtWarning(quotas)).toEqual([]);
    const inf: UsageQuota[] = [quota(999999, Infinity)];
    expect(getMetricsAtWarning(inf)).toEqual([]);
  });
});

// TEST 7 — percentage
describe("TEST 7 — PERCENTAGE", () => {
  it("unlimited percentage is 0, never negative/NaN", () => {
    expect(getUsagePercentage(2, -1)).toBe(0);
    expect(getUsagePercentage(2, Infinity)).toBe(0);
    expect(getUsagePercentage(999, -1)).toBe(0);
    expect(Number.isNaN(getUsagePercentage(2, -1))).toBe(false);
  });
  it("finite percentage correct", () => {
    expect(getUsagePercentage(2, 10)).toBe(20);
    expect(getUsagePercentage(10, 10)).toBe(100);
  });
});

// TEST 8 — display
describe("TEST 8 — DISPLAY", () => {
  it("never produces / -1", () => {
    expect(formatUsageDisplay(2, -1, "")).not.toContain("/ -1");
    expect(formatUsageDisplay(2, -1, "")).not.toContain("-1");
    expect(formatUsageDisplay(2, Infinity, "")).not.toContain("-1");
  });
  it("finite still shows fraction", () => {
    expect(formatUsageDisplay(2, 10, "")).toBe("2 / 10 ");
    expect(formatUsageDisplay(2, 10, "items")).toBe("2 / 10 items");
  });
});

// TEST 9 — finite regression
describe("TEST 9 — FINITE QUOTA REGRESSION", () => {
  it("2/10 ok, 20%, not over", () => {
    expect(getUsageStatus(2, 10)).toBe("ok");
    expect(getUsagePercentage(2, 10)).toBe(20);
    expect(isMetricOverLimit(quota(2, 10))).toBe(false);
    expect(getMetricsOverLimit([quota(2, 10)])).toEqual([]);
  });
});

// TEST 10 — zero/disabled regression
describe("TEST 10 — ZERO/DISABLED REGRESSION", () => {
  it("limit 0 does not become unlimited", () => {
    expect(getUsageStatus(0, 0)).toBe("over_limit"); // 0 used >=0 limit → over_limit (disabled semantics)
    expect(getUsageStatus(1, 0)).toBe("over_limit");
    expect(isMetricOverLimit(quota(1, 0))).toBe(true);
    expect(formatUsageDisplay(1, 0, "")).toBe("1 / 0 ");
    // but 0 is not confused with unlimited
    expect(getUsageStatus(999, -1)).toBe("ok"); // unlimited stays ok
  });
});

// TEST 11 — server/UI parity
describe("TEST 11 — SERVER/UI PARITY", () => {
  it("server allows unlimited, UI not over-limit", () => {
    const server = capabilityService.checkLimit("creator_grow", "max_products", 999999);
    expect(server.isUnlimited).toBe(true);
    expect(server.isExceeded).toBe(false);
    // UI side same capability after billing normalization
    expect(isMetricOverLimit(quota(999999, Infinity))).toBe(false);
    expect(isMetricOverLimit(quota(999999, -1))).toBe(false);
    expect(getMetricsOverLimit([quota(999999, -1), quota(999999, Infinity)])).toEqual([]);
  });
});

// TEST 12 — storage regression
describe("TEST 12 — STORAGE REGRESSION", () => {
  it("Growth storage remains 100 MB finite", async () => {
    h.mockFindSubscriptionWithPlan.mockResolvedValue({
      plan: { code: "creator_grow" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    const info = await billingService.getBillingInfo("ws1", "tenant1");
    const storage = info.usage.find((u) => u.metric === "storage")!;
    expect(storage.limit).toBe(100);
    expect(storage.unit).toBe("MB");
  });
  it("Launch storage 20 MB, Scale 300 MB", async () => {
    h.mockFindSubscriptionWithPlan.mockResolvedValueOnce({
      plan: { code: "creator_launch" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    const launch = await billingService.getBillingInfo("ws1", "tenant1");
    expect(launch.usage.find((u) => u.metric === "storage")!.limit).toBe(20);

    h.mockFindSubscriptionWithPlan.mockResolvedValueOnce({
      plan: { code: "creator_scale" },
      status: "ACTIVE",
      trialEndsAt: null,
      renewsAt: null,
      cancelledAt: null,
      cancellationReason: null,
      id: "sub1",
      accountId: "ws1",
      workspaceId: "ws1",
      planId: "p1",
      createdAt: new Date(),
    } as never);
    const scale = await billingService.getBillingInfo("ws1", "tenant1");
    expect(scale.usage.find((u) => u.metric === "storage")!.limit).toBe(300);
  });
});
