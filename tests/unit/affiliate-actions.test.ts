import { describe, it, expect, vi, beforeEach } from "vitest";

const h = vi.hoisted(() => ({
  mockGetServerSession: vi.fn(),
  mockAffiliateCreate: vi.fn(),
  mockEnforceContentLimit: vi.fn(),
  mockLogAction: vi.fn(),
}));

vi.mock("next-auth", () => ({ getServerSession: h.mockGetServerSession }));
vi.mock("@/services/affiliate.service", () => ({ AffiliateService: { create: h.mockAffiliateCreate } }));
vi.mock("@/services/storage.service", () => ({ StorageService: { extractPathFromUrl: vi.fn(), delete: vi.fn() } }));
vi.mock("@/modules/billing/application/content-limit.enforcement", () => ({ enforceContentLimit: h.mockEnforceContentLimit }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/audit", () => ({ logAction: h.mockLogAction }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/security/rate-limiter", () => ({ checkRateLimit: vi.fn() }));

import { createAffiliate } from "@/actions/affiliate.actions";

function form() {
  const fd = new FormData();
  fd.set("title", "My Affiliate");
  fd.set("url", "https://example.com");
  fd.set("imageUrl", "");
  fd.set("isActive", "true");
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
  h.mockGetServerSession.mockResolvedValue({ user: { id: "u1", tenantId: "t1" } });
  h.mockAffiliateCreate.mockResolvedValue({ id: "af-1" });
  h.mockEnforceContentLimit.mockResolvedValue({ ok: true });
  h.mockLogAction.mockResolvedValue(undefined);
});

describe("createAffiliate — RCCF-35 max_links enforcement", () => {
  it("creates the affiliate when the link content limit has headroom", async () => {
    const res = await createAffiliate({ success: false }, form());

    expect(h.mockEnforceContentLimit).toHaveBeenCalledWith({ tenantId: "t1", featureKey: "max_links" });
    expect(h.mockAffiliateCreate).toHaveBeenCalledTimes(1);
    expect(res).toMatchObject({ success: true });
  });

  it("rejects the creation when the link limit is exhausted (Launch bypass closed)", async () => {
    h.mockEnforceContentLimit.mockResolvedValue({ ok: false, reason: "Link limit reached" });

    const res = await createAffiliate({ success: false }, form());

    expect(res).toMatchObject({ success: false, error: "Link limit reached" });
    expect(h.mockAffiliateCreate).not.toHaveBeenCalled();
  });

  it("passes the schema-validated fields to the service", async () => {
    await createAffiliate({ success: false }, form());

    expect(h.mockAffiliateCreate).toHaveBeenCalledWith("t1", {
      title: "My Affiliate",
      url: "https://example.com",
      isActive: true,
    });
  });
});
