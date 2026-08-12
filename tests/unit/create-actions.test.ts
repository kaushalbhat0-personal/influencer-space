import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockLoad, mockSave, mockPublish, mockWebsiteUpdate, mockGetServerSession, mockUserFindUnique, mockWebsiteFindUnique } = vi.hoisted(() => ({
  mockLoad: vi.fn(),
  mockSave: vi.fn(),
  mockPublish: vi.fn(),
  mockWebsiteUpdate: vi.fn(),
  mockGetServerSession: vi.fn(),
  mockUserFindUnique: vi.fn(),
  mockWebsiteFindUnique: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/lib/builder/builder-service", () => ({
  BuilderService: class {
    load = mockLoad;
    save = mockSave;
  },
}));

vi.mock("@/lib/publishing/service", () => ({
  publishingService: { publish: mockPublish },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    website: { findUnique: mockWebsiteFindUnique, update: mockWebsiteUpdate },
    user: { findUnique: mockUserFindUnique },
  },
}));

import { applyBlueprintToWebsite } from "@/actions/create.actions";

function session(overrides: { tenantId?: string | null } = {}) {
  return { user: { id: "u1", role: "ADMIN", tenantId: overrides.tenantId ?? "t1" } };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockReset();
  mockUserFindUnique.mockReset();
  mockWebsiteFindUnique.mockReset();
  mockLoad.mockReset();
  mockSave.mockReset();
  mockPublish.mockReset();
  mockWebsiteUpdate.mockReset();

  mockGetServerSession.mockResolvedValue(session());
  mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: "t1" });
  mockWebsiteFindUnique.mockResolvedValue({ id: "w1", tenantId: "t1" });
  mockLoad.mockResolvedValue([]);
  mockSave.mockResolvedValue(undefined);
  mockPublish.mockResolvedValue({ success: true, version: 1 });
  mockWebsiteUpdate.mockResolvedValue({});
});

describe("applyBlueprintToWebsite — RCCF-21 authorization", () => {
  it("allows the tenant owner to apply the blueprint and publish", async () => {
    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(true);
    expect(mockSave).toHaveBeenCalledTimes(1);
    const pages = mockSave.mock.calls[0][1] as Array<{ sections: Array<{ slots: unknown[] }> }>;
    expect(pages[0].sections.length).toBeGreaterThan(0);
    expect(pages[0].sections[0].slots.length).toBeGreaterThan(0);
    expect(mockWebsiteUpdate).toHaveBeenCalledWith({ where: { id: "w1" }, data: { themePackageId: "com.creatos.neon-dark" } });
    expect(mockPublish).toHaveBeenCalledWith("t1");
  });

  it("rejects a cross-tenant request with ZERO side effects", async () => {
    mockWebsiteFindUnique.mockResolvedValue({ id: "w1", tenantId: "t2" });

    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(false);
    expect(res.error).toBe("Forbidden");
    expect(mockLoad).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWebsiteUpdate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("rejects an unauthenticated caller with zero side effects", async () => {
    mockGetServerSession.mockResolvedValue(null);

    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(false);
    expect(res.error).toBe("Unauthorized");
    expect(mockLoad).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWebsiteUpdate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("rejects a non-existent website with zero side effects", async () => {
    mockWebsiteFindUnique.mockResolvedValue(null);

    const res = await applyBlueprintToWebsite("nope", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(false);
    expect(res.error).toBe("Website not found");
    expect(mockLoad).not.toHaveBeenCalled();
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockWebsiteUpdate).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("rejects a caller with no tenant (cannot target any website)", async () => {
    mockUserFindUnique.mockResolvedValue({ id: "u1", tenantId: null });

    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(false);
    expect(res.error).toBe("Forbidden");
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPublish).not.toHaveBeenCalled();
  });

  it("tenantId spoofing is impossible: the action takes no client tenantId", async () => {
    // There is no tenantId parameter on the action — the client can only
    // supply a websiteId, and ownership is resolved server-side. Attempting
    // another tenant's websiteId is rejected (covered above).
    const keys = applyBlueprintToWebsite.length;
    expect(keys).toBe(3); // (websiteId, blueprintId, themeId)
  });
});

describe("applyBlueprintToWebsite — layout behavior (RCCF-19)", () => {
  it("is non-destructive: does not overwrite an existing layout", async () => {
    mockLoad.mockResolvedValue([{ id: "p1", name: "Home", slug: "/", isHome: true, order: 1, sections: [] }]);

    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(true);
    expect(mockSave).not.toHaveBeenCalled();
    expect(mockPublish).toHaveBeenCalledWith("t1");
  });

  it("returns the publish error when publishing fails", async () => {
    mockPublish.mockResolvedValue({ success: false, error: "No pages to publish" });

    const res = await applyBlueprintToWebsite("w1", "com.creatos.creator", "com.creatos.neon-dark");

    expect(res.success).toBe(false);
    expect(res.error).toContain("No pages");
    expect(mockSave).toHaveBeenCalled();
  });
});