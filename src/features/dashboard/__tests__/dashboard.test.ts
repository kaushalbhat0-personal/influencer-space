import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProductFindMany, mockProductCount, mockOrderCount, mockOrderAggregate, mockGalleryCount, mockLinkCount, mockContactCount, mockPublishFindFirst, mockAuditFindMany, mockTenantFindUnique, mockSettingFindUnique } = vi.hoisted(() => ({
  mockProductFindMany: vi.fn(),
  mockProductCount: vi.fn(),
  mockOrderCount: vi.fn(),
  mockOrderAggregate: vi.fn(),
  mockGalleryCount: vi.fn(),
  mockLinkCount: vi.fn(),
  mockContactCount: vi.fn(),
  mockPublishFindFirst: vi.fn(),
  mockAuditFindMany: vi.fn(),
  mockTenantFindUnique: vi.fn(),
  mockSettingFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    product: { findMany: mockProductFindMany, count: mockProductCount },
    productOrder: { count: mockOrderCount, aggregate: mockOrderAggregate },
    galleryImage: { count: mockGalleryCount },
    affiliateLink: { count: mockLinkCount },
    contactSubmission: { count: mockContactCount },
    publishStatus: { findFirst: mockPublishFindFirst },
    auditLog: { findMany: mockAuditFindMany },
    tenant: { findUnique: mockTenantFindUnique },
    setting: { findUnique: mockSettingFindUnique },
    generationSession: { findMany: vi.fn().mockResolvedValue([]) },
    analyticsEvent: { findMany: vi.fn().mockResolvedValue([]) },
    workspace: { findUnique: vi.fn().mockResolvedValue(null) },
    website: { findUnique: vi.fn().mockResolvedValue({ id: "w1" }) },
    publishSnapshot: { findMany: vi.fn().mockResolvedValue([]) },
    booking: { count: vi.fn().mockResolvedValue(0) },
    offering: { count: vi.fn().mockResolvedValue(0) },
  },
}));

import { dashboardService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Dashboard service", () => {
  it("getMetrics returns all metrics", async () => {
    mockProductFindMany.mockResolvedValue([{ id: "1", isActive: true, status: "PUBLISHED" }, { id: "2", isActive: false, status: "DRAFT" }]);
    mockOrderCount.mockResolvedValue(5);
    mockOrderAggregate.mockResolvedValue({ _sum: { amount: 10000 } });
    mockGalleryCount.mockResolvedValue(20);
    mockLinkCount.mockResolvedValue(3);
    mockContactCount.mockResolvedValue(7);
    mockPublishFindFirst.mockResolvedValue({ state: "live", liveVersion: 3 });

    const result = await dashboardService.getMetrics("t1");
    expect(result.productCount).toBe(2);
    expect(result.activeProductCount).toBe(1);
    expect(result.orderCount).toBe(5);
    expect(result.revenue).toBe(10000);
    expect(result.galleryCount).toBe(20);
    expect(result.linkCount).toBe(3);
    expect(result.messageCount).toBe(7);
    expect(result.publishedVersion).toBe(3);
  });

  it("getMetrics handles zero data", async () => {
    mockProductFindMany.mockResolvedValue([]);
    mockOrderCount.mockResolvedValue(0);
    mockOrderAggregate.mockResolvedValue({ _sum: { amount: null } });
    mockGalleryCount.mockResolvedValue(0);
    mockLinkCount.mockResolvedValue(0);
    mockContactCount.mockResolvedValue(0);
    mockPublishFindFirst.mockResolvedValue(null);

    const result = await dashboardService.getMetrics("t1");
    expect(result.productCount).toBe(0);
    expect(result.revenue).toBe(0);
    expect(result.publishedVersion).toBeNull();
  });

  it("getActivity returns recent audit log entries", async () => {
    mockAuditFindMany.mockResolvedValue([
      { id: "a1", action: "product:created", createdAt: new Date() },
      { id: "a2", action: "product:updated", createdAt: new Date() },
    ]);
    const result = await dashboardService.getActivity("t1");
    expect(result).toHaveLength(2);
    expect(result[0].type).toBe("product:created");
  });
});
