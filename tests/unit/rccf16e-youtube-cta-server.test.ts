import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockList, mockRequireTenant } = vi.hoisted(() => ({
  mockList: vi.fn(),
  mockRequireTenant: vi.fn(),
}));

vi.mock("@/features/integrations/service", () => ({
  integrationService: { list: mockList },
}));

vi.mock("@/lib/auth/require-tenant", () => ({
  requireTenant: (...args: unknown[]) => mockRequireTenant(...args),
}));

import { YouTubeEnhancementCtaServer } from "@/features/integrations/components/youtube-enhancement-cta.server";

describe("RCCF-PRELAUNCH-16E — YouTubeEnhancementCtaServer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireTenant.mockResolvedValue({ tenantId: "t1" });
  });

  it("reuses existing integrationService (no parallel flow) and shows disconnected CTA when not connected", async () => {
    mockList.mockResolvedValue([
      { platform: "youtube", status: "not_connected" },
      { platform: "instagram", status: "not_connected" },
    ]);
    const element = await YouTubeEnhancementCtaServer();
    expect(mockList).toHaveBeenCalledWith("t1");
    // element should be YouTubeEnhancementCta with isConnected=false
    expect((element as any).props.isConnected).toBe(false);
  });

  it("shows connected state when youtube status is connected", async () => {
    mockList.mockResolvedValue([{ platform: "youtube", status: "connected" }]);
    const element = await YouTubeEnhancementCtaServer();
    expect((element as any).props.isConnected).toBe(true);
  });

  it("gracefully falls back to disconnected CTA when service unavailable", async () => {
    mockList.mockRejectedValue(new Error("DB down"));
    const element = await YouTubeEnhancementCtaServer();
    expect((element as any).props.isConnected).toBe(false);
    expect((element as any).props.isUnavailable).toBe(true);
  });

  it("gracefully falls back when tenant auth fails", async () => {
    mockRequireTenant.mockRejectedValue(new Error("Unauthorized"));
    const element = await YouTubeEnhancementCtaServer();
    expect((element as any).props.isConnected).toBe(false);
    expect((element as any).props.isUnavailable).toBe(true);
  });

  it("does not fetch additional YouTube data (only integrationService.list)", async () => {
    mockList.mockResolvedValue([{ platform: "youtube", status: "not_connected" }]);
    await YouTubeEnhancementCtaServer();
    expect(mockList).toHaveBeenCalledTimes(1);
    expect(mockList).toHaveBeenCalledWith("t1");
  });
});
