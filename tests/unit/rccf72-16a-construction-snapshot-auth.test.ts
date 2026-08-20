/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

// RCCF-72.16A — getConstructionSnapshot must never resolve a tenant from a
// client-supplied sessionId/subdomain without verifying ownership. Behavioral
// tests that execute the real server action and assert on the returned result
// and whether the tenant pipeline was reached.

const v = vi.hoisted(() => {
  const hoisted = {
    mockGetServerSession: vi.fn(),
    mockTenantFindFirst: vi.fn(),
    mockUserCount: vi.fn(),
    mockWebsiteFindUnique: vi.fn(),
    mockSessionGetById: vi.fn(),
    mockWorkspaceFindById: vi.fn(),
    mockBuilderLoad: vi.fn(),
    mockBuildWithDiagnostics: vi.fn(),
    mockNavGetOrGenerate: vi.fn(),
    mockBuildSnapshot: vi.fn(),
    mockLayoutResolve: vi.fn(),
    reset: () => {
      for (const key of Object.keys(hoisted)) {
        if (key === "reset") continue;
        (hoisted as any)[key].mockReset();
      }
      hoisted.mockGetServerSession.mockResolvedValue({ user: { id: "u-owner", tenantId: "t-owner", role: "ADMIN" } });
      hoisted.mockTenantFindFirst.mockResolvedValue(null);
      hoisted.mockUserCount.mockResolvedValue(0);
      hoisted.mockWebsiteFindUnique.mockResolvedValue({
        id: "w1",
        themePackageId: "pkg-1",
        themeColors: {},
        themeFonts: {},
        themeConfig: {},
      });
      hoisted.mockSessionGetById.mockResolvedValue(null);
      hoisted.mockWorkspaceFindById.mockResolvedValue(null);
      hoisted.mockBuilderLoad.mockResolvedValue([{ id: "b1", isHome: true, sections: [] }]);
      hoisted.mockBuildWithDiagnostics.mockResolvedValue({
        aggregate: { identity: { name: "Creator Name", tagline: "Tagline" } },
      });
      hoisted.mockNavGetOrGenerate.mockResolvedValue([]);
      hoisted.mockBuildSnapshot.mockReturnValue({});
      hoisted.mockLayoutResolve.mockReturnValue({
        theme: { accent: "#fff" },
        navigation: [],
        metadata: { title: "Title", description: "Description" },
        pages: [
          { isHome: true, sections: [{ id: "s1", moduleId: "m1", visible: true, config: { heading: "Hi" } }] },
        ],
      });
    },
  };
  return hoisted;
});

vi.mock("next-auth", () => ({ getServerSession: v.mockGetServerSession }));
vi.mock("@/lib/auth", () => ({ authOptions: {} }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    tenant: { findFirst: v.mockTenantFindFirst },
    user: { count: v.mockUserCount },
    website: { findUnique: v.mockWebsiteFindUnique },
  },
}));
vi.mock("@/lib/generation/session", () => ({
  sessionService: { getById: v.mockSessionGetById },
}));
vi.mock("@/modules/workspace/infrastructure/repository", () => ({
  workspaceRepository: { findById: v.mockWorkspaceFindById },
}));
vi.mock("@/lib/builder/builder-service", () => ({
  BuilderService: class {
    load = v.mockBuilderLoad;
  },
}));
vi.mock("@/modules/tenant/application/website-aggregate.service", () => ({
  websiteAggregateService: { buildWithDiagnostics: v.mockBuildWithDiagnostics },
}));
vi.mock("@/lib/navigation/service", () => ({
  navigationService: { getOrGenerate: v.mockNavGetOrGenerate },
}));
vi.mock("@/lib/storefront/build-snapshot", () => ({ buildRuntimeSnapshot: v.mockBuildSnapshot }));
vi.mock("@/lib/storefront/layout-engine", () => ({ layoutEngine: { resolve: v.mockLayoutResolve } }));

import { getConstructionSnapshot } from "@/actions/construction.actions";

beforeEach(() => {
  v.reset();
});

describe("getConstructionSnapshot — RCCF-72.16A authorization", () => {
  it("rejects an anonymous caller resolving by subdomain", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await getConstructionSnapshot({ subdomain: "victim" });

    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(v.mockTenantFindFirst).not.toHaveBeenCalled();
    expect(v.mockBuildSnapshot).not.toHaveBeenCalled();
  });

  it("rejects an anonymous caller resolving by sessionId", async () => {
    v.mockGetServerSession.mockResolvedValue(null);

    const res = await getConstructionSnapshot({ sessionId: "gs-1" });

    expect(res).toEqual({ success: false, error: "Unauthorized" });
    expect(v.mockSessionGetById).not.toHaveBeenCalled();
    expect(v.mockBuildSnapshot).not.toHaveBeenCalled();
  });

  it("returns the snapshot for an owner resolving their own subdomain", async () => {
    v.mockTenantFindFirst.mockResolvedValue({ id: "t-owner" });
    v.mockUserCount.mockResolvedValue(1);

    const res = await getConstructionSnapshot({ subdomain: "my-store" });

    expect(res.success).toBe(true);
    expect(v.mockUserCount).toHaveBeenCalledWith({ where: { id: "u-owner", tenantId: "t-owner" } });
    expect(v.mockBuildSnapshot).toHaveBeenCalled();
    expect(res.snapshot).toMatchObject({
      meta: { title: "Title", creatorName: "Creator Name", tagline: "Tagline" },
      sections: [{ sectionId: "s1", moduleId: "m1" }],
    });
  });

  it("rejects an owner resolving a foreign subdomain (masked, pipeline never runs)", async () => {
    v.mockTenantFindFirst.mockResolvedValue({ id: "t-victim" });
    v.mockUserCount.mockResolvedValue(0);

    const res = await getConstructionSnapshot({ subdomain: "victim" });

    expect(res).toEqual({ success: false, error: "Not found" });
    expect(v.mockBuildSnapshot).not.toHaveBeenCalled();
  });

  it("rejects an owner resolving a foreign sessionId (masked, pipeline never runs)", async () => {
    v.mockSessionGetById.mockResolvedValue({
      id: "gs-victim",
      workspaceId: "ws-victim",
      creatorId: "u-victim",
    });

    const res = await getConstructionSnapshot({ sessionId: "gs-victim" });

    expect(res).toEqual({ success: false, error: "Not found" });
    expect(v.mockWorkspaceFindById).not.toHaveBeenCalled();
    expect(v.mockBuildSnapshot).not.toHaveBeenCalled();
  });

  it("allows a SUPER_ADMIN to resolve any subdomain", async () => {
    v.mockGetServerSession.mockResolvedValue({ user: { id: "u-super", tenantId: null, role: "SUPER_ADMIN" } });
    v.mockTenantFindFirst.mockResolvedValue({ id: "t-victim" });
    v.mockUserCount.mockResolvedValue(0);

    const res = await getConstructionSnapshot({ subdomain: "victim" });

    expect(res.success).toBe(true);
    expect(v.mockBuildSnapshot).toHaveBeenCalled();
  });
});