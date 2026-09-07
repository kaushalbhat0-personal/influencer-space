import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockTenantFindUnique, mockSocialStatsFindMany } = vi.hoisted(() => ({
  mockTenantFindUnique: vi.fn(),
  mockSocialStatsFindMany: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findUnique: mockTenantFindUnique },
    socialStats: { findMany: mockSocialStatsFindMany },
  },
}));

import { integrationService } from "@/features/integrations/service";

beforeEach(() => {
  vi.clearAllMocks();
  mockSocialStatsFindMany.mockResolvedValue([]);
  mockTenantFindUnique.mockResolvedValue({ youtubeApiKey: "k", youtubeChannelId: "c", instagramApiKey: null, instagramAccessToken: null });
});

describe("RCCF-INT-SOCIAL-UI — SocialStats consumer wiring", () => {
  it("populated stats: youtube and instagram both return correct numbers", async () => {
    mockSocialStatsFindMany.mockResolvedValue([
      { platform: "youtube", followers: 12345, views: 987654, posts: 42, updatedAt: new Date("2026-09-01T10:00:00Z") },
      { platform: "instagram", followers: 5000, views: 0, posts: 120, updatedAt: new Date("2026-09-02T10:00:00Z") },
    ]);
    const result = await integrationService.list("tenant-1");
    const yt = result.find((r) => r.platform === "youtube")!;
    const ig = result.find((r) => r.platform === "instagram")!;
    expect(yt.stats).toEqual(expect.objectContaining({ followers: 12345, views: 987654, posts: 42 }));
    expect(ig.stats).toEqual(expect.objectContaining({ followers: 5000, views: 0, posts: 120 }));
    expect(yt.stats?.updatedAt).toBe(new Date("2026-09-01T10:00:00Z").toISOString());
  });

  it("missing stats: returns null and never invents numbers", async () => {
    mockSocialStatsFindMany.mockResolvedValue([]);
    const result = await integrationService.list("tenant-1");
    for (const r of result) {
      if (r.platform === "youtube" || r.platform === "instagram") {
        expect(r.stats).toBeNull();
      }
    }
    // Ensure no default 0 is invented — service returns null, UI will show "No live data yet"
  });

  it("partial provider data: only youtube row exists, instagram stays null", async () => {
    mockSocialStatsFindMany.mockResolvedValue([
      { platform: "youtube", followers: 999, views: 111, posts: 1, updatedAt: new Date() },
    ]);
    const result = await integrationService.list("tenant-1");
    const yt = result.find((r) => r.platform === "youtube")!;
    const ig = result.find((r) => r.platform === "instagram")!;
    expect(yt.stats?.followers).toBe(999);
    expect(ig.stats).toBeNull();
    const ga = result.find((r) => r.platform === "google_analytics")!;
    expect(ga.stats).toBeNull();
  });

  it("tenant isolation: queries are scoped to the requested tenantId", async () => {
    mockSocialStatsFindMany.mockResolvedValue([]);
    await integrationService.list("tenant-A");
    expect(mockTenantFindUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: "tenant-A" } }));
    expect(mockSocialStatsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "tenant-A" } }));
    vi.clearAllMocks();
    mockSocialStatsFindMany.mockResolvedValue([]);
    await integrationService.list("tenant-B");
    expect(mockSocialStatsFindMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: "tenant-B" } }));
    // Ensure B cannot read A's stats — mock would return different rows per tenant in real DB via where clause
  });

  it("stale stats are still returned verbatim (UI handles staleness, service does not invent fresh)", async () => {
    const staleDate = new Date(Date.now() - 10 * 24 * 3600 * 1000);
    mockSocialStatsFindMany.mockResolvedValue([
      { platform: "youtube", followers: 1, views: 2, posts: 3, updatedAt: staleDate },
    ]);
    const result = await integrationService.list("tenant-1");
    const yt = result.find((r) => r.platform === "youtube")!;
    expect(yt.stats?.followers).toBe(1);
    expect(new Date(yt.stats!.updatedAt!).getTime()).toBe(staleDate.getTime());
  });

  it("does not leak SocialStats across tenants via cache or global state", async () => {
    mockSocialStatsFindMany.mockResolvedValueOnce([{ platform: "youtube", followers: 111, views: 222, posts: 3, updatedAt: new Date() }]);
    const a = await integrationService.list("tenant-A");
    expect(a.find((r) => r.platform === "youtube")?.stats?.followers).toBe(111);

    mockSocialStatsFindMany.mockResolvedValueOnce([{ platform: "youtube", followers: 999, views: 888, posts: 7, updatedAt: new Date() }]);
    const b = await integrationService.list("tenant-B");
    expect(b.find((r) => r.platform === "youtube")?.stats?.followers).toBe(999);
    expect(b.find((r) => r.platform === "youtube")?.stats?.followers).not.toBe(111);
  });
});
