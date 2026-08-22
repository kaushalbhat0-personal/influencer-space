import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOrdersFindMany, mockProductCount, mockGalleryCount, mockContactCount, mockAnalyticsFindMany, mockGenSessionFindMany, mockWorkspaceFindUnique } = vi.hoisted(() => ({
  mockOrdersFindMany: vi.fn(),
  mockProductCount: vi.fn(),
  mockGalleryCount: vi.fn(),
  mockContactCount: vi.fn(),
  mockAnalyticsFindMany: vi.fn(),
  mockGenSessionFindMany: vi.fn(),
  mockWorkspaceFindUnique: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    productOrder: { findMany: mockOrdersFindMany },
    product: { count: mockProductCount },
    galleryImage: { count: mockGalleryCount },
    contactSubmission: { count: mockContactCount },
    analyticsEvent: { findMany: mockAnalyticsFindMany },
    generationSession: { findMany: mockGenSessionFindMany },
    workspace: { findUnique: mockWorkspaceFindUnique },
  },
}));

import { analyticsService } from "../service";

beforeEach(() => { vi.clearAllMocks(); });

describe("Analytics service", () => {
  it("getData returns analytics", async () => {
    mockOrdersFindMany.mockResolvedValue([
      { amount: 100, status: "COMPLETED", createdAt: new Date() },
      { amount: 200, status: "COMPLETED", createdAt: new Date() },
    ]);
    mockProductCount.mockResolvedValue(5);
    mockGalleryCount.mockResolvedValue(10);
    mockContactCount.mockResolvedValue(3);
    mockAnalyticsFindMany.mockResolvedValue([
      { id: "1", eventType: "page_view", tenantId: "t1", payload: { page: "/" }, occurredAt: new Date(), createdAt: new Date(), source: "web" },
    ]);
    mockGenSessionFindMany.mockResolvedValue([]);
    mockWorkspaceFindUnique.mockResolvedValue({ id: "ws-1" });

    const result = await analyticsService.getData("t1");
    expect(result.visitors).toBe(1);
    expect(result.totalRevenue).toBe(300);
    expect(result.conversions).toBe(2);
    expect(result.topPages).toHaveLength(1);
  });

  it("getData handles zero orders", async () => {
    mockOrdersFindMany.mockResolvedValue([]);
    mockProductCount.mockResolvedValue(0);
    mockGalleryCount.mockResolvedValue(0);
    mockContactCount.mockResolvedValue(0);
    mockAnalyticsFindMany.mockResolvedValue([]);
    mockGenSessionFindMany.mockResolvedValue([]);
    mockWorkspaceFindUnique.mockResolvedValue(null);

    const result = await analyticsService.getData("t1");
    expect(result.visitors).toBe(0);
    expect(result.totalRevenue).toBe(0);
    expect(result.conversionRate).toBe(0);
    expect(result.topPages).toHaveLength(0);
  });

  it("calculates conversion rate correctly", async () => {
    mockOrdersFindMany.mockResolvedValue([
      { amount: 50, status: "COMPLETED", createdAt: new Date() },
    ]);
    mockProductCount.mockResolvedValue(1);
    mockGalleryCount.mockResolvedValue(1);
    mockContactCount.mockResolvedValue(0);
    mockAnalyticsFindMany.mockResolvedValue(
      Array.from({ length: 10 }).map((_, i) => ({
        id: `e-${i}`, eventType: "page_view", tenantId: "t1", payload: { page: "/" }, occurredAt: new Date(), createdAt: new Date(), source: "web",
      })),
    );
    mockGenSessionFindMany.mockResolvedValue([]);
    mockWorkspaceFindUnique.mockResolvedValue(null);

    const result = await analyticsService.getData("t1");
    expect(result.conversionRate).toBe(10);
  });
});
