import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetServerSession, mockFindTheme, mockUpdateTheme, mockMarkChangesPending, mockResolveActivePlan } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockFindTheme: vi.fn(),
  mockUpdateTheme: vi.fn(),
  mockMarkChangesPending: vi.fn(),
  mockResolveActivePlan: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("@/modules/tenant/infrastructure/website-repository", () => ({
  websiteRepository: { findTheme: mockFindTheme, updateTheme: mockUpdateTheme },
}));

vi.mock("@/lib/publishing/service", () => ({
  publishingService: { markChangesPending: mockMarkChangesPending },
}));

vi.mock("@/modules/billing/application/plan-source", () => ({
  resolveActivePlan: mockResolveActivePlan,
}));

import { updateTheme } from "@/actions/theme.actions";

function session(overrides: { tenantId?: string } = {}) {
  return { user: { id: "u1", role: "ADMIN", tenantId: overrides.tenantId ?? "tenant-1" } };
}

function existingTheme() {
  return { id: "w1", themeColors: {}, themeFonts: {}, themeConfig: {} };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockReset();
  mockFindTheme.mockReset();
  mockUpdateTheme.mockReset();
  mockMarkChangesPending.mockReset();
  mockMarkChangesPending.mockResolvedValue(undefined);
  mockResolveActivePlan.mockReset();
});

describe("updateTheme — RCCF-11 premium_themes gate", () => {
  it("rejects Launch tenants without premium_themes", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });

    const result = await updateTheme("tenant-1", { primary: "#fff" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Creator Grow");
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("allows Growth tenants with premium_themes", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    mockFindTheme.mockResolvedValue(existingTheme());

    const result = await updateTheme("tenant-1", { primary: "#ff00aa", font: "inter" });

    expect(result.success).toBe(true);
    expect(mockUpdateTheme).toHaveBeenCalledWith(
      "w1",
      expect.objectContaining({
        themeColors: expect.objectContaining({ primary: "#ff00aa" }),
        themeFonts: expect.objectContaining({ heading: expect.stringContaining("Inter") }),
      }),
    );
    expect(mockMarkChangesPending).toHaveBeenCalledWith("tenant-1");
  });

  it("rejects cross-tenant invocation", async () => {
    mockGetServerSession.mockResolvedValue(session({ tenantId: "tenant-2" }));

    const result = await updateTheme("tenant-1", { primary: "#fff" });

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unauthorized");
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });
});