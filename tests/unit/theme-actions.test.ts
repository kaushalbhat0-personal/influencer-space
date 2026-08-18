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
  it("rejects Launch tenants without the advanced_builder capability", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    mockFindTheme.mockResolvedValue(existingTheme());

    const result = await updateTheme("tenant-1", { primary: "#fff" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Theme capability required");
    expect(result.error).toContain("advanced_builder");
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("allows Growth tenants with the advanced_builder capability", async () => {
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

describe("updateTheme — RCCF-71.6.4 background image server gate", () => {
  it("rejects a Launch tenant setting the image preset OR its direct keys (same gate)", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_launch", origin: "v2", status: "ACTIVE" });
    mockFindTheme.mockResolvedValue(existingTheme());

    const viaPreset = await updateTheme("tenant-1", { experienceBackground: "image" });
    const viaDirectKey = await updateTheme("tenant-1", { experienceBackgroundImage: "/uploads/x.jpg" });

    expect(viaPreset.success).toBe(false);
    expect(viaDirectKey.success).toBe(false);
    // Single authority: the preset and the direct keys reject through the SAME
    // capability gate (no separate plan-code checks).
    expect(viaPreset.error).toBe(viaDirectKey.error);
    expect(viaPreset.error).toContain("Theme capability required");
    expect(mockUpdateTheme).not.toHaveBeenCalled();
  });

  it("allows a Growth tenant to persist the background image preset, URL and opacity", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_grow", origin: "v2", status: "ACTIVE" });
    mockFindTheme.mockResolvedValue(existingTheme());

    const result = await updateTheme("tenant-1", {
      experienceBackground: "image",
      experienceBackgroundImage: "/uploads/bg.jpg",
      experienceBackgroundImageOpacity: "40",
    });

    expect(result.success).toBe(true);
    expect(mockUpdateTheme).toHaveBeenCalledWith(
      "w1",
      expect.objectContaining({
        themeConfig: expect.objectContaining({
          experienceBackground: "image",
          experienceBackgroundImage: "/uploads/bg.jpg",
          experienceBackgroundImageOpacity: "40",
        }),
      }),
    );
  });

  it("never stores an unsafe background image URL", async () => {
    mockGetServerSession.mockResolvedValue(session());
    mockResolveActivePlan.mockResolvedValue({ code: "creator_scale", origin: "v2", status: "ACTIVE" });
    mockFindTheme.mockResolvedValue(existingTheme());

    const result = await updateTheme("tenant-1", { experienceBackgroundImage: "javascript:alert(1)" });

    expect(result.success).toBe(true);
    expect(mockUpdateTheme).toHaveBeenCalledWith(
      "w1",
      expect.objectContaining({
        themeConfig: expect.not.objectContaining({ experienceBackgroundImage: "javascript:alert(1)" }),
      }),
    );
  });
});