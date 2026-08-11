/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetServerSession, mockSettingsService, mockRevalidatePath } = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockSettingsService: { updateTenantChannels: vi.fn(), updateTenantApiKeys: vi.fn(), clearTenantIntegration: vi.fn() },
  mockRevalidatePath: vi.fn(),
}));

vi.mock("next-auth", () => ({
  getServerSession: mockGetServerSession,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mockRevalidatePath,
}));

vi.mock("@/services/settings.service", () => ({
  SettingsService: mockSettingsService,
}));

vi.mock("@/lib/audit", () => ({ logAction: vi.fn() }));
vi.mock("@/lib/publishing/content-change", () => ({ afterContentChange: vi.fn() }));
vi.mock("@/lib/observability/error-tracker", () => ({ captureError: vi.fn() }));

import {
  updateSocialChannels,
  updateApiKeys,
  clearIntegration,
} from "@/actions/settings.actions";

function session(overrides: { tenantId?: string; role?: string; id?: string }) {
  return {
    user: {
      id: overrides.id ?? "user-1",
      role: overrides.role ?? "ADMIN",
      tenantId: overrides.tenantId ?? "tenant-1",
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetServerSession.mockReset();
  mockSettingsService.updateTenantChannels.mockReset();
  mockSettingsService.updateTenantApiKeys.mockReset();
  mockSettingsService.clearTenantIntegration.mockReset();
});

describe("updateSocialChannels", () => {
  it("only writes fields present in the form (does not wipe Twitch)", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const formData = new FormData();
    formData.set("youtubeChannelId", "  UC-1  ");

    const result = await updateSocialChannels("tenant-1", { success: false }, formData);

    expect(result.success).toBe(true);
    expect(mockSettingsService.updateTenantChannels).toHaveBeenCalledWith("tenant-1", {
      youtubeChannelId: "UC-1",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/integrations");
  });

  it("returns success without touching anything when no channel fields submitted", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const formData = new FormData();
    formData.set("unrelated", "x");

    const result = await updateSocialChannels("tenant-1", { success: false }, formData);

    expect(result.success).toBe(true);
    expect(mockSettingsService.updateTenantChannels).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant mutation", async () => {
    mockGetServerSession.mockResolvedValue(session({ tenantId: "tenant-2" }));
    const formData = new FormData();
    formData.set("youtubeChannelId", "UC-1");

    const result = await updateSocialChannels("tenant-1", { success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
    expect(mockSettingsService.updateTenantChannels).not.toHaveBeenCalled();
  });
});

describe("updateApiKeys", () => {
  it("writes keys to the tenant", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const formData = new FormData();
    formData.set("youtubeApiKey", "key-123");

    const result = await updateApiKeys("tenant-1", { success: false }, formData);

    expect(result.success).toBe(true);
    expect(mockSettingsService.updateTenantApiKeys).toHaveBeenCalledWith("tenant-1", {
      youtubeApiKey: "key-123",
    });
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/integrations");
  });

  it("rejects cross-tenant mutation", async () => {
    mockGetServerSession.mockResolvedValue(session({ tenantId: "tenant-2" }));
    const formData = new FormData();
    formData.set("instagramApiKey", "ig-key");

    const result = await updateApiKeys("tenant-1", { success: false }, formData);

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
    expect(mockSettingsService.updateTenantApiKeys).not.toHaveBeenCalled();
  });
});

describe("clearIntegration", () => {
  it("clears youtube integration for the tenant", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const result = await clearIntegration("tenant-1", "youtube");

    expect(result.success).toBe(true);
    expect(mockSettingsService.clearTenantIntegration).toHaveBeenCalledWith("tenant-1", "youtube");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/admin/integrations");
  });

  it("clears instagram integration for the tenant", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const result = await clearIntegration("tenant-1", "instagram");

    expect(result.success).toBe(true);
    expect(mockSettingsService.clearTenantIntegration).toHaveBeenCalledWith("tenant-1", "instagram");
  });

  it("rejects unsupported platforms", async () => {
    mockGetServerSession.mockResolvedValue(session({}));
    const result = await clearIntegration("tenant-1", "twitch");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Unsupported integration");
    expect(mockSettingsService.clearTenantIntegration).not.toHaveBeenCalled();
  });

  it("rejects cross-tenant clear", async () => {
    mockGetServerSession.mockResolvedValue(session({ tenantId: "tenant-2" }));
    const result = await clearIntegration("tenant-1", "youtube");

    expect(result.success).toBe(false);
    expect(result.error).toBe("Forbidden");
    expect(mockSettingsService.clearTenantIntegration).not.toHaveBeenCalled();
  });
});